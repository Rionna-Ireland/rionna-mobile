import type { GestureResponderEvent, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import type { HapticIntent } from '@/lib/motion';
import * as React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { disabledOpacity, durations, haptics, pressScale, pressScaleSmall, springs, timings, useMotion } from '@/lib/motion';

import colors from './colors';
import { withAlpha } from './gradient-styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Android press feedback: bounded Material ripple, ink @ 12% (S14-00 decision 15). */
export const RIPPLE_COLOR = withAlpha(colors.ink, 0.12);

export type MotionPressableProps = Omit<PressableProps, 'style'> & {
  className?: string;
  /** Static styles only: press state is driven by the primitive, not a style function. */
  style?: StyleProp<ViewStyle>;
  /**
   * `small` (chips, icon buttons) presses deeper: `pressScaleSmall`. `flat`
   * (full-bleed list rows) doesn't scale: pair it with `pressedOpacity`. iOS only.
   */
  size?: 'default' | 'small' | 'flat';
  /** Opacity while pressed (iOS), e.g. 0.85. Omit to keep full opacity. */
  pressedOpacity?: number;
  /**
   * Dim to `disabledOpacity` while `disabled` (default true). Pass false for
   * controls that lock without looking unavailable (e.g. vote options showing
   * results after the vote).
   */
  dimDisabled?: boolean;
  /** Haptic fired on press, from the motion vocabulary. */
  haptic?: HapticIntent;
  ref?: React.Ref<View>;
};

type FeedbackOptions = {
  enabled: boolean;
  scaleTo: number;
  pressedOpacity?: number;
  /** `undefined` = the caller doesn't manage disabled: opacity stays theirs. */
  disabled?: boolean | null;
};

/**
 * iOS press feedback. Opacity is only emitted when the primitive owns it
 * (`pressedOpacity` or a `disabled` prop): otherwise an animated `opacity: 1`
 * would beat the caller's className opacity (A-003: disabled buttons looked
 * enabled). Disabled folds into the resting opacity and fades on `quick`.
 */
function usePressFeedback({ enabled, scaleTo, pressedOpacity, disabled }: FeedbackOptions) {
  const ownsOpacity = pressedOpacity !== undefined || (disabled !== undefined && disabled !== null);
  const rest = disabled ? disabledOpacity : 1;
  const scale = useSharedValue(1);
  const opacity = useSharedValue(rest);
  React.useEffect(() => {
    opacity.set(withTiming(rest, timings.quick));
  }, [rest, opacity]);
  const animatedStyle = useAnimatedStyle(() => (ownsOpacity
    ? { opacity: opacity.get(), transform: [{ scale: scale.get() }] }
    : { transform: [{ scale: scale.get() }] }));
  const pressIn = React.useCallback(() => {
    if (!enabled)
      return;
    scale.set(withSpring(scaleTo, springs.snappy));
    if (pressedOpacity !== undefined)
      opacity.set(withTiming(pressedOpacity, { duration: durations.instant }));
  }, [enabled, scaleTo, pressedOpacity, scale, opacity]);
  const pressOut = React.useCallback(() => {
    if (!enabled)
      return;
    scale.set(withSpring(1, springs.snappy));
    opacity.set(withTiming(rest, { duration: durations.instant }));
  }, [enabled, rest, scale, opacity]);
  return { animatedStyle, pressIn, pressOut };
}

/**
 * Motion press primitive (S14-01 §6). iOS: scales to `pressScale` on the
 * `snappy` spring (+ optional pressed opacity); Reduce Motion drops the scale.
 * Android: a bounded `android_ripple` in ink @ 12%, no scale (Material idiom).
 * Add `overflow-hidden` + a radius for the ripple to follow rounded corners.
 * `disabled` dims to `disabledOpacity` on both platforms (A-003).
 *
 * Exported as `MotionPressable` because `@/components/ui` already re-exports
 * RN's `Pressable`. S14-02 swaps it into Button, Chip, Card, IconButton, etc.
 */
export function MotionPressable({
  size = 'default',
  pressedOpacity,
  haptic,
  style,
  onPress,
  onPressIn,
  onPressOut,
  android_ripple,
  disabled,
  dimDisabled = true,
  ...props
}: MotionPressableProps) {
  const { reduceMotion } = useMotion();
  const isAndroid = Platform.OS === 'android';
  const scaleTo = reduceMotion || size === 'flat' ? 1 : size === 'small' ? pressScaleSmall : pressScale;
  const dimmed = dimDisabled ? disabled : undefined;
  const feedback = usePressFeedback({ enabled: !isAndroid, scaleTo, pressedOpacity, disabled: dimmed });

  const handlePress = (e: GestureResponderEvent) => {
    if (haptic)
      haptics[haptic]();
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={(e) => {
        feedback.pressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        feedback.pressOut();
        onPressOut?.(e);
      }}
      android_ripple={isAndroid ? (android_ripple ?? { color: RIPPLE_COLOR, borderless: false }) : undefined}
      style={isAndroid ? [style, dimmed ? styles.disabled : null] : [style, feedback.animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: disabledOpacity },
});
