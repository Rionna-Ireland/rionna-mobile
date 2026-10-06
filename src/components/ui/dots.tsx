import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { twMerge } from 'tailwind-merge';

import { springs, useMotion } from '@/lib/motion';

import colors from './colors';
import { DOT_SIZE, dotMetrics } from './dot-metrics';

export type DotsProps = {
  count: number;
  /** Zero-based active page (accessibility, and the position when `progress` is absent). */
  index: number;
  /**
   * Live fractional page position from the carousel's scroll handler
   * (`contentOffset.x / pageWidth`). The pill then tracks the finger.
   */
  progress?: SharedValue<number>;
  className?: string;
  testID?: string;
};

/**
 * Carousel page dots (S13-01 §7, S14-02 §7): lilac, gap 6. The active dot is
 * a 16pt pill and the rest fade to 30%, interpolated from the scroll position
 * when `progress` is passed. Without it the dots settle to `index` on the
 * `gentle` spring (instantly under Reduce Motion).
 */
export function Dots({ count, index, progress, className, testID }: DotsProps) {
  const { reduceMotion } = useMotion();
  const settled = useSharedValue(index);
  React.useEffect(() => {
    settled.set(reduceMotion ? index : withSpring(index, springs.gentle));
  }, [index, reduceMotion, settled]);
  const position = progress ?? settled;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1, text: `${index + 1} / ${count}` }}
      className={twMerge('flex-row items-center gap-1.5', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} i={i} position={position} testID={testID ? `${testID}-${i}` : undefined} />
      ))}
    </View>
  );
}

function Dot({ i, position, testID }: { i: number; position: SharedValue<number>; testID?: string }) {
  const style = useAnimatedStyle(() => dotMetrics(position.get(), i));
  return <Animated.View testID={testID} style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  dot: { height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: colors.onPrimaryContainer },
});
