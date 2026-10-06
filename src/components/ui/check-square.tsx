import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { timings, useMotion } from '@/lib/motion';

import colors from './colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Tick in a 24×24 box; `CHECK_LENGTH` is (a touch over) its stroke length. */
const CHECK_PATH = 'M6 12.5l4 4 8-9';
const CHECK_LENGTH = 18;

export type CheckSquareProps = {
  checked: boolean;
  /** Edge length in points (polls 20, charity vote 15). */
  size?: number;
  radius?: number;
  /** Checked fill. */
  fill?: string;
  /** Unchecked square. */
  track?: string;
  checkColor?: string;
  testID?: string;
};

/**
 * Vote checkbox square (S14-02 §9): checking crossfades the fill in and draws
 * the tick (SVG `strokeDashoffset`), both over `quick`; unchecking reverses.
 * Reduce Motion flips instantly. Decorative: the row carries the a11y state.
 */
export function CheckSquare({
  checked,
  size = 20,
  radius = 4,
  fill = colors.primary,
  track = colors.secondaryContainer,
  checkColor = colors.white,
  testID,
}: CheckSquareProps) {
  const { reduceMotion } = useMotion();
  const progress = useSharedValue(checked ? 1 : 0);
  React.useEffect(() => {
    const target = checked ? 1 : 0;
    progress.set(reduceMotion ? target : withTiming(target, timings.quick));
  }, [checked, reduceMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - progress.get()) }));

  return (
    <View
      testID={testID}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.square, { width: size, height: size, borderRadius: radius, backgroundColor: track }]}
    >
      <Animated.View
        testID={testID ? `${testID}-fill` : undefined}
        style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: fill }, fillStyle]}
      />
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <AnimatedPath
          d={CHECK_PATH}
          stroke={checkColor}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LENGTH}
          animatedProps={tickProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  square: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
