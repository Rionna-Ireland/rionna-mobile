import type { ArrivalValues } from './arrival-context';
import type { Rect } from './lib/arrival-geometry';
import type { ArrivalState } from './lib/arrival-machine';
import * as React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import Animated, { FadeIn, useAnimatedStyle } from 'react-native-reanimated';

import { AnimatedSubmark, Submark, WordmarkLetters } from '@/components/brand/logo';
import { colors, Gradient } from '@/components/ui';

import { useArrival } from './arrival-context';
import { lockupRects } from './lib/arrival-geometry';
import { isActive } from './lib/arrival-machine';
import { hideNativeSplash } from './lib/native-splash';
import { PatternWave } from './pattern-wave';
import { baseRectFor } from './use-arrival-timeline';
import { WelcomeLines } from './welcome-lines';
import { WelcomeSpinner } from './welcome-spinner';

/** Space between the welcome mark and the "Welcome" lines (S13-02 frame 4). */
const WELCOME_GAP = 24;

function useOpacity(value: ArrivalValues[keyof ArrivalValues]) {
  return useAnimatedStyle(() => ({ opacity: value.get() }));
}

/** Plain white (= the native splash) → the light gradient blooms → navy (signed out). */
function Backdrop({ values }: { values: ArrivalValues }) {
  const bloom = useOpacity(values.bloom);
  const navy = useOpacity(values.navy);
  return (
    <>
      <View style={[StyleSheet.absoluteFill, styles.white]} />
      <Animated.View style={[StyleSheet.absoluteFill, bloom]}>
        <Gradient variant="welcome-light" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, navy]}>
        <Gradient variant="welcome-navy" style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}

/** Signed out: the letters resolve beside the mark with a left-to-right wipe. */
function LockupLetters({ values, rect }: { values: ArrivalValues; rect: Rect }) {
  const windowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -rect.width * (1 - values.wipe.get()) }] }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rect.width * (1 - values.wipe.get()) }] }));
  const navy = useOpacity(values.navy);
  return (
    <View style={[styles.abs, styles.clip, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, windowStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
          <WordmarkLetters height={rect.height} color={colors.ink} />
          <Animated.View style={[StyleSheet.absoluteFill, navy]}>
            <WordmarkLetters height={rect.height} color={colors.secondaryContainer} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** The mark: draws, fills, breathes, then flies to its slot. Ink, or cream on navy. */
function ArrivalMark({ values, rect }: { values: ArrivalValues; rect: Rect }) {
  const style = useAnimatedStyle(() => ({
    opacity: values.markOpacity.get() * values.breath.get(),
    transform: [{ translateX: values.tx.get() }, { translateY: values.ty.get() }, { scale: values.scale.get() }],
  }));
  const cream = useOpacity(values.navy);
  return (
    <Animated.View testID="arrival-mark" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }, style]}>
      <AnimatedSubmark progress={values.progress} fillProgress={values.fill} color={colors.ink} size={rect.width} />
      <Animated.View style={[StyleSheet.absoluteFill, cream]}>
        <Submark width={rect.width} color={colors.secondaryContainer} />
      </Animated.View>
    </Animated.View>
  );
}

function WelcomeContent({ state, mark }: { state: ArrivalState; mark: Rect }) {
  const welcome = state.welcome;
  if (!welcome)
    return null;
  return (
    <>
      {welcome.full && <PatternWave />}
      <View style={[styles.abs, styles.welcome, { top: mark.y + mark.height + WELCOME_GAP }]}>
        <WelcomeLines name={welcome.name} />
        {state.phase === 'waitingForData' && (
          <Animated.View entering={FadeIn} style={styles.spinner}>
            <WelcomeSpinner />
          </Animated.View>
        )}
      </View>
    </>
  );
}

/**
 * The Arrival overlay (S14-04), above the whole navigator. Its first frame is
 * the native splash's (plain white, mark at progress 0), so the native splash
 * hides on this view's first layout with no visible jump.
 */
export function ArrivalOverlay() {
  const { state, values } = useArrival();
  const window = useWindowDimensions();
  const backdrop = useAnimatedStyle(() => ({ opacity: values ? values.backdrop.get() : 0 }));
  if (!values || !isActive(state))
    return null;
  const mark = baseRectFor(state.kind, window);
  const onNavy = state.mode === 'signedOut' && state.introDone;
  return (
    <View
      testID="arrival-overlay"
      style={StyleSheet.absoluteFill}
      pointerEvents={state.phase === 'handingOff' ? 'none' : 'auto'}
      onLayout={hideNativeSplash}
      accessibilityElementsHidden={state.kind === 'launch'}
    >
      <SystemBars style={onNavy ? 'light' : 'dark'} />
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <Backdrop values={values} />
        {state.kind === 'launch' && state.mode === 'signedOut' && (
          <LockupLetters values={values} rect={lockupRects(window).letters} />
        )}
        {state.kind === 'welcome' && <WelcomeContent state={state} mark={mark} />}
      </Animated.View>
      <ArrivalMark values={values} rect={mark} />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  clip: { overflow: 'hidden' },
  white: { backgroundColor: colors.white },
  welcome: { left: 32, right: 32, alignItems: 'center' },
  spinner: { marginTop: 44 },
});
