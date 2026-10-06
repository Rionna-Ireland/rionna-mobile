/**
 * Scroll-linked header maths (S14-02 §5). Pure worklets so they run on the UI
 * thread inside `useAnimatedStyle` and are unit-testable. Scroll-linked, not
 * time-based: nothing here is a duration, so Reduce Motion only drops scale.
 */

/** Tab roots: the large title hands over to the compact bar over this scroll (pt). */
export const COLLAPSE_DISTANCE = 60;
/** Compact bar height below the status bar (pt). */
export const COMPACT_BAR_HEIGHT = 44;
/** The large title shrinks to this scale as it collapses (left-anchored). */
export const LARGE_TITLE_MIN_SCALE = 0.92;
/** Mono-kicker screens: the header hairline is fully in after this scroll (pt). */
export const HAIRLINE_DISTANCE = 16;
/** Horse detail: the bar icons cross white → ink over this much scroll (pt). */
export const HERO_HANDOFF_DISTANCE = 24;

function clamp01(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

/** 0 at `start`, 1 at `end`, clamped. `end <= start` is a step at `start`. */
export function scrollProgress(y: number, start: number, end: number): number {
  'worklet';
  if (end <= start)
    return y >= start ? 1 : 0;
  return clamp01((y - start) / (end - start));
}

/** Tab-root collapse progress: 0 at rest (and while pulling to refresh), 1 at 60pt. */
export function collapseProgress(y: number): number {
  'worklet';
  return scrollProgress(y, 0, COLLAPSE_DISTANCE);
}

/** The large title fades out over the first 80% and scales down (no scale under Reduce Motion). */
export function largeTitleFrame(progress: number, reduceMotion: boolean): { opacity: number; scale: number } {
  'worklet';
  const p = clamp01(progress);
  return {
    opacity: 1 - clamp01(p / 0.8),
    scale: reduceMotion ? 1 : 1 - (1 - LARGE_TITLE_MIN_SCALE) * p,
  };
}

/** The compact centred title fades in over the second half, after the large one has mostly gone. */
export function compactTitleOpacity(progress: number): number {
  'worklet';
  return clamp01((progress - 0.5) / 0.5);
}

/** Kicker screens: hairline opacity for scroll `y`. */
export function hairlineOpacity(y: number): number {
  'worklet';
  return scrollProgress(y, 0, HAIRLINE_DISTANCE);
}

/**
 * Horse detail: 0 while the photo is under the bar, 1 once the hero's bottom
 * edge has passed under the bar's bottom edge (the last 24pt crossfade).
 */
export function heroHandoffProgress(y: number, heroHeight: number, barHeight: number): number {
  'worklet';
  if (heroHeight <= 0)
    return 0;
  const end = heroHeight - barHeight;
  return scrollProgress(y, end - HERO_HANDOFF_DISTANCE, end);
}
