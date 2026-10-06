/* eslint-disable react-refresh/only-export-components */
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { TextVariant } from './text-variants';
import * as React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { translate } from '@/lib/i18n';
import { timings, useMotion } from '@/lib/motion';

import colors from './colors';
import { withAlpha } from './gradient-styles';
import { TEXT_VARIANTS, textVariantStyle } from './text-variants';

/**
 * Skeleton primitive (S14-03 §1).
 *
 * - `light` tone (default): `secondary-container` cream shapes, for white cards
 *   and the page background.
 * - `dark` tone: white @8% shapes, for navy / plum / photo cards. Set it once
 *   for a subtree with `SkeletonTone`.
 * - Shimmer: a lighter band sweeps across each shape once per `shimmer`
 *   (1.2s, linear). It's a gradient layer translated on the UI thread, never
 *   animated gradient stops. Shapes inside one `SkeletonGroup` share a clock,
 *   so the sweep moves through a card together.
 * - Reduce Motion: no band at all, a static skeleton.
 *
 * Per-card skeletons live next to their cards and mirror their layout and
 * dimensions so the crossfade (`SkeletonSwap`) doesn't move anything.
 */

export type SkeletonToneValue = 'light' | 'dark';

const ToneContext = React.createContext<SkeletonToneValue>('light');
const ClockContext = React.createContext<SharedValue<number> | null>(null);

const BASE: Record<SkeletonToneValue, string> = {
  light: colors.secondaryContainer,
  dark: withAlpha(colors.white, 0.08),
};

const BAND: Record<SkeletonToneValue, string> = {
  light: withAlpha(colors.white, 0.55),
  dark: withAlpha(colors.white, 0.08),
};

/** The band's gradient: clear → highlight → clear across the shape's width. */
export function shimmerBandStyle(tone: SkeletonToneValue): ViewStyle {
  const clear = withAlpha(BAND[tone], 0);
  return {
    experimental_backgroundImage: `linear-gradient(to right, ${clear} 0%, ${BAND[tone]} 50%, ${clear} 100%)`,
  };
}

/** Band offset for clock `progress` (0–1) over a shape `width` wide: enters at −width, leaves at +width. */
export function shimmerOffset(progress: number, width: number): number {
  'worklet';
  return (progress * 2 - 1) * width;
}

/** Repeating 0→1 linear clock, `shimmer` per sweep; idle (0) when `run` is false. */
function useShimmerClock(run: boolean): SharedValue<number> {
  const clock = useSharedValue(0);
  React.useEffect(() => {
    if (!run)
      return;
    clock.set(withRepeat(withTiming(1, timings.shimmer), -1, false));
    return () => cancelAnimation(clock);
  }, [run, clock]);
  return clock;
}

/** Sets the tone for every `Skeleton` below it (`dark` inside navy/plum cards). */
export function SkeletonTone({ value, children }: { value: SkeletonToneValue; children: React.ReactNode }) {
  return <ToneContext value={value}>{children}</ToneContext>;
}

type SkeletonGroupProps = {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One loading surface (a card, a list): a single shimmer clock for its shapes,
 * announced once to screen readers as "Loading".
 */
export function SkeletonGroup({ children, className, style, testID }: SkeletonGroupProps) {
  const { reduceMotion } = useMotion();
  const clock = useShimmerClock(!reduceMotion);
  return (
    <ClockContext value={clock}>
      <View
        testID={testID}
        className={className}
        style={style}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={translate('common.loading')}
        accessibilityState={{ busy: true }}
      >
        {children}
      </View>
    </ClockContext>
  );
}

function Shimmer({ tone, clock }: { tone: SkeletonToneValue; clock: SharedValue<number> }) {
  const width = useSharedValue(0);
  const band = React.useMemo(() => shimmerBandStyle(tone), [tone]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerOffset(clock.get(), width.get()) }],
  }));
  return (
    <Animated.View
      testID="skeleton-shimmer"
      pointerEvents="none"
      onLayout={e => width.set(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, band, animatedStyle]}
    />
  );
}

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Corner radius; defaults to 4 (text bars). Pass `height / 2` for pills and circles. */
  radius?: number;
  /** Overrides the `SkeletonTone` context. */
  tone?: SkeletonToneValue;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** One skeleton shape. */
export function Skeleton({ width, height, radius = 4, tone, className, style, testID }: SkeletonProps) {
  const { reduceMotion } = useMotion();
  const contextTone = React.use(ToneContext);
  const groupClock = React.use(ClockContext);
  // Hooks run unconditionally; the local clock only ticks for a shape outside a group.
  const localClock = useShimmerClock(!reduceMotion && !groupClock);
  const resolved = tone ?? contextTone;
  return (
    <View
      testID={testID}
      className={className}
      style={[
        { width, height, borderRadius: radius, backgroundColor: BASE[resolved], overflow: 'hidden' },
        style,
      ]}
    >
      {reduceMotion ? null : <Shimmer tone={resolved} clock={groupClock ?? localClock} />}
    </View>
  );
}

/**
 * One line box of a text variant at the current font scale (capped like the
 * `Text` it stands in for), plus the display variants' descender padding,
 * which a `Text` adds once below its last line.
 */
export function useTextMetrics(variant: TextVariant): { line: number; padding: number } {
  const { fontScale } = useWindowDimensions();
  const { lineHeight, maxFontSizeMultiplier } = TEXT_VARIANTS[variant];
  const scale = Math.min(Math.max(fontScale || 1, 1), maxFontSizeMultiplier);
  const padding = textVariantStyle(variant).paddingBottom;
  return { line: Math.round(lineHeight * scale), padding: typeof padding === 'number' ? padding : 0 };
}

type SkeletonTextProps = {
  variant: TextVariant;
  /** Bar width; defaults to the full line. */
  width?: DimensionValue;
  /** Stacked lines (the last one runs to 60%). */
  lines?: number;
  className?: string;
  testID?: string;
};

/**
 * Stand-in for a `Text` of `variant`: each line occupies exactly the text's
 * line box (descender padding included), with a bar (¾ of the font size) centred
 * in it, so swapping in the real text moves nothing.
 */
export function SkeletonText({ variant, width = '100%', lines = 1, className, testID }: SkeletonTextProps) {
  const { line, padding } = useTextMetrics(variant);
  const bar = Math.max(6, Math.round(TEXT_VARIANTS[variant].fontSize * 0.75));
  return (
    <View testID={testID} className={className} style={{ paddingBottom: padding }}>
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={{ height: line, justifyContent: 'center' }}>
          <Skeleton height={bar} width={lines > 1 && i === lines - 1 ? '60%' : width} />
        </View>
      ))}
    </View>
  );
}
