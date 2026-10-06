/** Dots geometry and the scroll-position interpolation (S14-02 §7). */

/** Inactive dot: 6×6. */
export const DOT_SIZE = 6;
/** Active dot: a 16pt pill. */
export const DOT_ACTIVE_WIDTH = 16;
/** Inactive dots sit at 30%. */
export const DOT_INACTIVE_OPACITY = 0.3;

/**
 * Width/opacity of dot `i` at carousel position `position` (fractional page,
 * e.g. 1.4 = 40% of the way from page 1 to 2). Linear in the distance to the
 * dot, clamped at one page, so the pill hands over as the finger drags.
 */
export function dotMetrics(position: number, i: number) {
  'worklet';
  const distance = Math.min(1, Math.abs(position - i));
  return {
    width: DOT_ACTIVE_WIDTH - (DOT_ACTIVE_WIDTH - DOT_SIZE) * distance,
    opacity: DOT_INACTIVE_OPACITY + (1 - DOT_INACTIVE_OPACITY) * (1 - distance),
  };
}
