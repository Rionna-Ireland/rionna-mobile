/**
 * S14-06 charity counter: the pure decisions behind the count-up, the goal
 * draw and the wave. Kept free of React and native modules so they're unit
 * tested directly; `use-charity-counter.ts` wires them to storage and motion.
 */

export type CharitySurface = 'home' | 'charity';

/** What a surface shows: counts `from` → `to` (whole euros) when `animate`, else `to` statically. */
export type CountPlan = { from: number; to: number; animate: boolean };

export function wholeEuros(cents: number): number {
  return Math.max(0, Math.floor(cents / 100));
}

type PlanInput = {
  /** The total this member last saw on this surface (cents), or null on a first-ever view. */
  lastSeenCents: number | null;
  totalCents: number;
  reduceMotion: boolean;
  /** This surface already had its moment this session (once per session per surface). */
  playedThisSession: boolean;
};

/**
 * Start-value decision (S14-06 §1): a first-ever view counts from €0, a
 * later view counts only the increase since last seen, and an unchanged (or
 * lower) total is static. Reduce Motion and a second showing in the same
 * session are always static. Compared in whole euros, as displayed.
 */
export function countUpPlan({ lastSeenCents, totalCents, reduceMotion, playedThisSession }: PlanInput): CountPlan {
  const to = wholeEuros(totalCents);
  if (reduceMotion || playedThisSession)
    return { from: to, to, animate: false };
  const from = lastSeenCents === null ? 0 : wholeEuros(lastSeenCents);
  return from < to ? { from, to, animate: true } : { from: to, to, animate: false };
}

/** MMKV key for the last-seen total, per member and per surface. */
export function lastSeenKey(memberId: string, surface: CharitySurface): string {
  return `charity:last-seen:${memberId}:${surface}`;
}

/** A persisted last-seen value is only trusted when it's a finite, non-negative number. */
export function parseLastSeen(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null;
}

/** Home starts the moment once the card is at least this visible (S14-06 §5). */
export const VISIBILITY_THRESHOLD = 0.6;

export type VerticalBox = { top: number; height: number };
export type Viewport = { top: number; bottom: number };

/**
 * Fraction (0–1) of a box inside the viewport (both in window points). A
 * box taller than the viewport counts as fully visible when it fills it.
 */
export function visibleFraction({ top, height }: VerticalBox, { top: viewTop, bottom: viewBottom }: Viewport): number {
  'worklet';
  if (height <= 0 || viewBottom <= viewTop)
    return 0;
  const overlap = Math.min(top + height, viewBottom) - Math.max(top, viewTop);
  if (overlap <= 0)
    return 0;
  return Math.min(1, overlap / Math.min(height, viewBottom - viewTop));
}

// Once per session per surface: module memory, cleared on a cold start.
const playedThisSession = new Set<string>();

export function hasPlayedThisSession(key: string): boolean {
  return playedThisSession.has(key);
}

export function markPlayedThisSession(key: string): void {
  playedThisSession.add(key);
}

/** Tests only. */
export function resetCharityCounterSession(): void {
  playedThisSession.clear();
}
