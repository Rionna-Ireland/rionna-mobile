import type { ImageSource } from 'expo-image';
import type { ViewProps } from 'react-native';
import type { FallbackColourway } from './photo-fallback';
import type { TileSpec } from '@/components/brand/pattern';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { PatternFill } from '@/components/brand/pattern';

import colors from './colors';
import { Gradient } from './gradient';
import { Image } from './image';
import { MotionPressable } from './pressable';

/**
 * Design V2 card (S13-01 §7). r8, p16, no shadow.
 * - `white` (default): white on the page gradient.
 * - `navy`: navy hero/news card.
 * - `plum`: plum harlequin pattern under the plum-mid glow (charity snapshot).
 * - `forest`: forest base with the green pattern subdued under a forest veil
 *   (charity hero; Figma frame 15).
 * - `sage`: sage with a radial glow (wellbeing / member vote). Pass `pattern`
 *   for the faint pattern behind it.
 * - `photo`: full-bleed image with a navy scrim for text legibility; a
 *   missing or broken image falls back to the `fallbackColourway` pattern.
 */
export type CardVariant = 'white' | 'navy' | 'plum' | 'forest' | 'sage' | 'photo';

const BG: Record<CardVariant, string> = {
  white: 'bg-white',
  navy: 'bg-primary',
  plum: 'bg-plum',
  forest: 'bg-forest',
  sage: 'bg-sage',
  photo: 'bg-primary',
};

const PLUM_PATTERN: TileSpec = { kind: 'harlequin', colourway: 'plum', turn: 0 };
const FOREST_PATTERN: TileSpec = { kind: 'harlequin', colourway: 'green', turn: 0 };

/** Veil opacity over the pattern: higher = quieter motifs. */
export const FOREST_VEIL_OPACITY = 0.78;
export const SAGE_VEIL_OPACITY = 0.82;

export type CardProps = ViewProps & {
  variant?: CardVariant;
  /** `photo` only: the image. */
  image?: ImageSource | string | null;
  /** `photo` only: pattern colourway if the image is missing/fails (default cream). */
  fallbackColourway?: FallbackColourway;
  /** `plum`/`forest`: override the pattern tile. `sage`: opt-in faint pattern. */
  pattern?: TileSpec;
  /**
   * Drawn over the backdrop (pattern, veil, glow) and under the content: the
   * S14-06 charity wave's lit tiles (`PatternWave`).
   */
  patternOverlay?: React.ReactNode;
  /** Drop the default 16pt padding (e.g. a card whose top is a full-bleed image). */
  noPadding?: boolean;
  className?: string;
  /**
   * Makes the whole card tappable with the S14 press scale (`MotionPressable`,
   * ripple on Android). Pass `accessibilityLabel` with it. No haptic: cards
   * navigate, and navigation stays silent.
   */
  onPress?: () => void;
};

function CardBackdrop({ variant, image, fallbackColourway, pattern }: Pick<CardProps, 'variant' | 'image' | 'fallbackColourway' | 'pattern'>) {
  if (variant === 'plum') {
    return (
      <>
        <PatternFill spec={pattern ?? PLUM_PATTERN} borderRadius={8} style={StyleSheet.absoluteFill} />
        <Gradient variant="card-plum-glow" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow]} />
      </>
    );
  }
  if (variant === 'forest') {
    return (
      <>
        <PatternFill spec={pattern ?? FOREST_PATTERN} borderRadius={8} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" testID="card-veil" style={[StyleSheet.absoluteFill, { backgroundColor: colors.forest, opacity: FOREST_VEIL_OPACITY }]} />
      </>
    );
  }
  if (variant === 'sage' && pattern) {
    return (
      <>
        <PatternFill spec={pattern} borderRadius={8} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" testID="card-veil" style={[StyleSheet.absoluteFill, { backgroundColor: colors.sage, opacity: SAGE_VEIL_OPACITY }]} />
        <Gradient variant="card-sage-glow" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow]} />
      </>
    );
  }
  if (variant === 'sage') {
    return <Gradient variant="card-sage-glow" pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }
  if (variant === 'photo') {
    return (
      <>
        <Image
          source={image ?? null}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          fallback={{ colourway: fallbackColourway ?? 'cream' }}
          accessibilityIgnoresInvertColors
        />
        <Gradient variant="photo-scrim" pointerEvents="none" style={StyleSheet.absoluteFill} />
      </>
    );
  }
  return null;
}

export function Card({
  variant = 'white',
  image,
  fallbackColourway,
  pattern,
  patternOverlay,
  noPadding = false,
  className,
  children,
  onPress,
  ...props
}: CardProps) {
  const cardClass = twMerge('overflow-hidden rounded-lg', BG[variant], !noPadding && 'p-4', className);
  const content = (
    <>
      <CardBackdrop variant={variant} image={image} fallbackColourway={fallbackColourway} pattern={pattern} />
      {patternOverlay}
      {children}
    </>
  );
  if (onPress) {
    return (
      <MotionPressable accessibilityRole="button" {...props} onPress={onPress} className={cardClass}>
        {content}
      </MotionPressable>
    );
  }
  return (
    <View {...props} className={cardClass}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma: pattern + plum-mid @60% over the plum base.
  glow: { opacity: 0.6 },
});
