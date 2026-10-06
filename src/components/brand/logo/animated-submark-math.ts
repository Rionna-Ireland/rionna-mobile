import { SUBMARK_PATH_LENGTH, SUBMARK_VIEWBOX } from './constants';

/**
 * Pure maths for `AnimatedSubmark` (S14-04 §1). Every function is a worklet so
 * the UI thread can call it from `useAnimatedProps` / `useAnimatedStyle`.
 */

/** The stroke starts fading once the fill is this far up the mark. */
export const STROKE_FADE_START = 0.6;

function clamp01(v: number): number {
  'worklet';
  return Math.min(1, Math.max(0, v));
}

/** `strokeDashoffset` for a draw `progress` 0..1: full length (nothing drawn) → 0. */
export function dashOffsetFor(progress: number): number {
  'worklet';
  return SUBMARK_PATH_LENGTH * (1 - clamp01(progress));
}

/** Stroke opacity: 1 until the fill passes `STROKE_FADE_START`, then fades to 0 with it. */
export function strokeOpacityFor(fillProgress: number): number {
  'worklet';
  const f = clamp01(fillProgress);
  if (f <= STROKE_FADE_START)
    return 1;
  return 1 - (f - STROKE_FADE_START) / (1 - STROKE_FADE_START);
}

/**
 * The bottom-up flood: how far (pt) the fill's clip window sits below its
 * resting position. `height` at 0 (empty), 0 at 1 (full).
 */
export function floodOffsetFor(fillProgress: number, height: number): number {
  'worklet';
  return height * (1 - clamp01(fillProgress));
}

/** Rendered height (pt) of the mark at `width`, from the viewBox aspect. */
export function submarkHeightFor(width: number): number {
  return width * (SUBMARK_VIEWBOX.height / SUBMARK_VIEWBOX.width);
}

/**
 * The stroke is centred on the outline, so half of it sits outside the
 * viewBox. The stroke SVG is padded by this many viewBox units on every side
 * (and by `strokeWidth / 2` pt in layout) so the mark keeps the exact scale of
 * the static `Submark` at the same `size`.
 */
export function strokePadUnits(size: number, strokeWidth: number): number {
  return (strokeWidth / 2) * (SUBMARK_VIEWBOX.width / size);
}
