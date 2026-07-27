import { getItem, removeItem, setItem } from '@/lib/storage';

/**
 * On-device cache of the Circle community access token so the Community
 * WebView can open instantly instead of minting a token on every open.
 *
 * Backed by the shared MMKV instance via the @/lib/storage helpers (the same
 * pattern used by src/lib/auth/utils.tsx).
 */
export type CachedCircleSession = {
  accessToken: string;
  /** ISO 8601 timestamp (e.g. "2026-06-10T12:00:00.000Z"). */
  expiresAt: string;
};

const CIRCLE_SESSION_KEY = 'circle.session.v1';

const DEFAULT_SKEW_MS = 60_000;

/** Returns the cached session, or null if absent or unparseable. */
export function getCachedCircleSession(): CachedCircleSession | null {
  try {
    const session = getItem<CachedCircleSession>(CIRCLE_SESSION_KEY);
    if (
      session
      && typeof session.accessToken === 'string'
      && typeof session.expiresAt === 'string'
    ) {
      return session;
    }
    return null;
  }
  catch {
    return null;
  }
}

/** Persists the session as JSON via the shared MMKV instance. */
export function setCachedCircleSession(session: CachedCircleSession): void {
  setItem<CachedCircleSession>(CIRCLE_SESSION_KEY, session);
}

/** Removes the cached session. */
export function clearCachedCircleSession(): void {
  removeItem(CIRCLE_SESSION_KEY);
}

/**
 * True iff `session` is non-null and not within `skewMs` of its expiry:
 * `now < Date.parse(session.expiresAt) - skewMs`.
 * Returns false for null, unparseable, or expired sessions.
 */
export function isCircleSessionFresh(
  session: CachedCircleSession | null,
  now: number = Date.now(),
  skewMs: number = DEFAULT_SKEW_MS,
): boolean {
  if (!session) {
    return false;
  }
  const expiresAtMs = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return false;
  }
  return now < expiresAtMs - skewMs;
}
