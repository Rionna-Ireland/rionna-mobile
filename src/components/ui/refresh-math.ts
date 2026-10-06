/**
 * Pure maths for the branded pull-to-refresh (S14-03 §2). Worklets, so the
 * UI thread can run them from scroll-driven styles and reactions.
 */

/** Pull distance (pt) over which the submark outline draws; crossing it fires the haptic. */
export const REFRESH_PULL_THRESHOLD = 80;

/** Overscroll above the top, in pt (scroll offsets go negative while pulling on iOS). */
export function pullDistance(scrollY: number): number {
  'worklet';
  return Math.max(0, -scrollY);
}

/** Outline draw progress 0→1 over 0→`REFRESH_PULL_THRESHOLD` of pull. */
export function pullProgress(scrollY: number): number {
  'worklet';
  return Math.min(1, pullDistance(scrollY) / REFRESH_PULL_THRESHOLD);
}

/**
 * Threshold latch, one haptic per pull: fires the first time the pull reaches
 * the threshold, stays latched while the pull wobbles around it (or the
 * content is held open while refreshing), and re-arms only once the content is
 * back at rest (pull 0).
 */
export function crossThreshold(latched: boolean, scrollY: number): { latched: boolean; fire: boolean } {
  'worklet';
  const pull = pullDistance(scrollY);
  if (pull <= 0)
    return { latched: false, fire: false };
  if (!latched && pull >= REFRESH_PULL_THRESHOLD)
    return { latched: true, fire: true };
  return { latched, fire: false };
}
