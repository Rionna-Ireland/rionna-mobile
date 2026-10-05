import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import type { HapticIntent } from '@/lib/motion';
import * as React from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { durations, haptics, pressScale, pressScaleSmall, springs, useMotion } from '@/lib/motion';

import colors from './colors';
import { withAlpha } from './gradient-styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Android press feedback: bounded Material ripple, ink @ 12% (S14-00 decision 15). */
export const RIPPLE_COLOR = withAlpha(colors.ink, 0.12);

export type MotionPressableProps = Omit<PressableProps, 'style'> & {
  className?: string;
  /** Static styles only: press state is driven by the primitive, not a style function. */
  style?: StyleProp<ViewStyle>;
  /** `small` (chips, icon buttons) presses deeper: `pressScaleSmall`. iOS only. */
  size?: 'default' | 'small';
  /** Opacity while pressed (iOS), e.g. 0.85. Omit to keep full opacity. */
  pressedOpacity?: number;
  /** Haptic fired on press, from the motion vocabulary. */
  haptic?: HapticIntent;
};

function usePressFeedback(enabled: boolean, scaleTo: number, pressedOpacity?: number) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
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
    opacity.set(withTiming(1, { duration: durations.instant }));
  }, [enabled, scale, opacity]);
  return { animatedStyle, pressIn, pressOut };
}

/**
 * Motion press primitive (S14-01 §6). iOS: scales to `pressScale` on the
 * `snappy` spring (+ optional pressed opacity); Reduce Motion drops the scale.
 * Android: a bounded `android_ripple` in ink @ 12%, no scale (Material idiom).
 * Add `overflow-hidden` + a radius for the ripple to follow rounded corners.
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
  ...props
}: MotionPressableProps) {
  const { reduceMotion } = useMotion();
  const isAndroid = Platform.OS === 'android';
  const scaleTo = reduceMotion ? 1 : size === 'small' ? pressScaleSmall : pressScale;
  const feedback = usePressFeedback(!isAndroid, scaleTo, pressedOpacity);

  const handlePress = (e: GestureResponderEvent) => {
    if (haptic)
      haptics[haptic]();
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      {...props}
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
      style={isAndroid ? style : [style, feedback.animatedStyle]}
    />
  );
}
