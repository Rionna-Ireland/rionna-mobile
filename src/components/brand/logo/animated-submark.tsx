import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import {
  dashOffsetFor,
  floodOffsetFor,
  strokeOpacityFor,
  strokePadUnits,
  submarkHeightFor,
} from './animated-submark-math';
import { SUBMARK_PATH, SUBMARK_PATH_LENGTH, SUBMARK_VIEWBOX } from './constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type AnimatedSubmarkProps = {
  /** 0..1 stroke draw. */
  progress: SharedValue<number>;
  /** 0..1 bottom-up flood fill; the stroke fades out as it completes. */
  fillProgress: SharedValue<number>;
  /** Stroke + fill colour. */
  color: string;
  /** Rendered width in pt (height from the viewBox aspect). */
  size: number;
  /** Stroke width in pt. Default 1.5. */
  strokeWidth?: number;
  testID?: string;
};

const VIEWBOX = `0 0 ${SUBMARK_VIEWBOX.width} ${SUBMARK_VIEWBOX.height}`;

/**
 * The horse-head submark drawn by hand (S14-04 §1, decision 14): the outline
 * strokes in with `progress`, then floods with colour from the bottom with
 * `fillProgress` while the stroke fades out. Purely driven: the caller owns
 * the timing (Arrival, S14-03's pull-to-refresh).
 *
 * The flood is a translate-only clip (an `overflow: hidden` window sliding up
 * while its content slides down by the same amount) rather than an animated
 * SVG `ClipPath`: transforms stay on the UI thread on both platforms and the
 * filled mark at `fillProgress = 1` is pixel-identical to the static `Submark`.
 */
export function AnimatedSubmark({
  progress,
  fillProgress,
  color,
  size,
  strokeWidth = 1.5,
  testID,
}: AnimatedSubmarkProps) {
  const height = submarkHeightFor(size);
  const pad = strokePadUnits(size, strokeWidth);
  const unitsPerPt = SUBMARK_VIEWBOX.width / size;

  const strokeProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffsetFor(progress.get()),
    strokeOpacity: progress.get() <= 0 ? 0 : strokeOpacityFor(fillProgress.get()),
  }));
  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floodOffsetFor(fillProgress.get(), height) }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -floodOffsetFor(fillProgress.get(), height) }],
  }));

  return (
    <View
      testID={testID}
      accessibilityLabel="Rionna"
      accessibilityRole="image"
      style={{ width: size, height }}
    >
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        <Animated.View testID={testID ? `${testID}-fill` : undefined} style={[StyleSheet.absoluteFill, windowStyle, styles.clip]}>
          <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
            <Svg width={size} height={height} viewBox={VIEWBOX}>
              <Path fillRule="nonzero" fill={color} d={SUBMARK_PATH} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
      <Svg
        width={size + strokeWidth}
        height={height + strokeWidth}
        viewBox={`${-pad} ${-pad} ${SUBMARK_VIEWBOX.width + 2 * pad} ${SUBMARK_VIEWBOX.height + 2 * pad}`}
        style={{ position: 'absolute', left: -strokeWidth / 2, top: -strokeWidth / 2 }}
      >
        <AnimatedPath
          testID={testID ? `${testID}-stroke` : undefined}
          d={SUBMARK_PATH}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * unitsPerPt}
          strokeLinejoin="round"
          strokeDasharray={`${SUBMARK_PATH_LENGTH} ${SUBMARK_PATH_LENGTH}`}
          animatedProps={strokeProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
