/**
 * Arrival instrumentation (S14-04 §3; verified in S14-07). Times are measured
 * from when the JS bundle started evaluating this module, which the root
 * layout imports first thing, so they include font loading and auth hydration.
 *
 * - `ttiMs`: the hand-off starts (the destination is visible and takes touches).
 * - `arrivalMs`: the overlay is gone.
 *
 * Logged in dev. There's no analytics SDK in the app yet; `reportArrival` is
 * the one place to forward these when one lands.
 */

const T0 = now();

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** Milliseconds since the JS bundle started. */
export function sinceStart(): number {
  return Math.round(now() - T0);
}

export type ArrivalMetrics = {
  kind: 'launch' | 'welcome';
  mode: string | null;
  ttiMs: number | null;
  arrivalMs: number;
  dataReadyMs: number | null;
  timedOut: boolean;
};

export function reportArrival(metrics: ArrivalMetrics): void {
  if (__DEV__)
    console.log('[arrival]', JSON.stringify(metrics));
}
