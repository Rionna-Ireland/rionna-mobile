/* eslint-disable react-refresh/only-export-components */
import type { RefreshControlProps } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { Platform, RefreshControl, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AnimatedSubmark } from '@/components/brand/logo/animated-submark';
import { haptics, timings, useMotion } from '@/lib/motion';

import colors from './colors';
import { crossThreshold, pullProgress } from './refresh-math';

/**
 * Branded pull-to-refresh (S14-03 §2).
 *
 * iOS: the native `RefreshControl` keeps the gesture, the trigger and the
 * held-open offset while refreshing, but its spinner is tinted transparent.
 * `RefreshIndicator`, an overlay pinned over the top of the scroll view, draws
 * the visual from the screen's scroll offset (the same `scrollY` the
 * collapsing header reads; pulling makes it negative, which keeps the header
 * collapse at 0):
 *
 * - the submark outline draws with the pull (0→80pt);
 * - crossing 80pt fires one `selection()` haptic per pull;
 * - when the refresh starts the outline fills (a mini-echo of the splash);
 * - while refreshing it breathes (opacity 1 ↔ 0.6, `breathe` each way);
 * - when it ends it fades out (`exit`, 180ms).
 *
 * Reduce Motion: the mark appears already filled (no draw, no breathing) and
 * only fades with the pull and on completion.
 *
 * Android (decision 15, platform idiom): the native Material spinner tinted
 * `primary`; `RefreshIndicator` renders nothing.
 */

const BRANDED = Platform.OS === 'ios';

/** Submark width (pt) in the refresher. */
export const REFRESH_MARK_SIZE = 28;

/** Drop-in `RefreshControl`: invisible spinner on iOS (the overlay draws), `primary` spinner on Android. */
export function BrandedRefreshControl(props: RefreshControlProps) {
  if (BRANDED)
    return <RefreshControl tintColor="transparent" {...props} />;
  return <RefreshControl colors={[colors.primary]} progressBackgroundColor={colors.white} {...props} />;
}

function fireSelection() {
  haptics.selection();
}

/** One `selection()` per pull, when the pull first reaches the threshold (UI-thread reaction). */
function useThresholdHaptic(scrollY: SharedValue<number>) {
  const latched = useSharedValue(false);
  useAnimatedReaction(
    () => scrollY.get(),
    (y) => {
      const next = crossThreshold(latched.get(), y);
      latched.set(next.latched);
      if (next.fire)
        scheduleOnRN(fireSelection);
    },
  );
}

/**
 * Refresh phases on the UI thread. `active` holds the mark fully shown from
 * the refresh start until its fade-out ends; `fade` is that fade-out.
 */
function useRefreshPhase(refreshing: boolean, reduceMotion: boolean) {
  const fill = useSharedValue(reduceMotion ? 1 : 0);
  const breath = useSharedValue(1);
  const active = useSharedValue(0);
  const fade = useSharedValue(1);
  const wasRefreshing = React.useRef(false);

  React.useEffect(() => {
    if (refreshing) {
      wasRefreshing.current = true;
      cancelAnimation(fade);
      fade.set(1);
      active.set(1);
      fill.set(reduceMotion ? 1 : withTiming(1, timings.crossfade));
      breath.set(reduceMotion ? 1 : withRepeat(withTiming(0.6, timings.breathe), -1, true));
      return;
    }
    if (!wasRefreshing.current)
      return;
    wasRefreshing.current = false;
    cancelAnimation(breath);
    fade.set(withTiming(0, timings.exit, (finished) => {
      'worklet';
      if (!finished)
        return;
      active.set(0);
      fill.set(reduceMotion ? 1 : 0);
      breath.set(1);
      fade.set(1);
    }));
  }, [refreshing, reduceMotion, fill, breath, active, fade]);

  return { fill, breath, active, fade };
}

type RefreshIndicatorProps = {
  /** The scroll view's vertical offset (negative while pulled past the top). */
  scrollY: SharedValue<number>;
  refreshing: boolean;
  /** y of the scroll view's top edge inside the overlay's parent (e.g. the status-bar inset). */
  top: number;
  color?: string;
  testID?: string;
};

/** The iOS overlay: render it after the scroll view, inside the same parent. Nothing on Android. */
export function RefreshIndicator(props: RefreshIndicatorProps) {
  if (!BRANDED)
    return null;
  return <SubmarkRefreshIndicator {...props} />;
}

function SubmarkRefreshIndicator({ scrollY, refreshing, top, color = colors.primary, testID = 'refresh-indicator' }: RefreshIndicatorProps) {
  const { reduceMotion } = useMotion();
  useThresholdHaptic(scrollY);
  const { fill, breath, active, fade } = useRefreshPhase(refreshing, reduceMotion);

  // Outline: follows the pull, held complete once refreshing (or always, under Reduce Motion).
  const draw = useDerivedValue(() => (reduceMotion || active.get() ? 1 : pullProgress(scrollY.get())));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: active.get() ? fade.get() * breath.get() : pullProgress(scrollY.get()),
  }));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.overlay, { top }, containerStyle]}
    >
      <AnimatedSubmark progress={draw} fillProgress={fill} color={color} size={REFRESH_MARK_SIZE} testID={`${testID}-mark`} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
