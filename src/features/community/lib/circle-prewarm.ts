import {
  getCachedCircleSession,
  isCircleSessionFresh,
  setCachedCircleSession,
} from '@/features/community/lib/circle-session-store';
import { getCircleCommunityBaseUrl } from '@/features/community/lib/circle-target';
import { client } from '@/lib/api/client';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';
import { setItem } from '@/lib/storage';

// Mirror the key the Community hook uses for the cached base URL so a warm
// open can resolve the community origin without a mint response. MUST stay in
// sync with use-community-session.ts (COMMUNITY_BASE_URL_KEY).
const COMMUNITY_BASE_URL_KEY = 'circle.communityBaseUrl.v1';

// Guards against overlapping in-flight mints within a single JS runtime (e.g.
// sign-in success and an AppState→active firing back-to-back). The freshness
// throttle handles the cache-hit case; this handles the not-yet-cached case
// where two callers race before the first mint resolves.
let mintInFlight: Promise<void> | null = null;

/**
 * Pre-warm the Circle session in the background (S6-03 B4) so the first
 * Community open skips the ~900ms backend mint. This now ONLY warms the
 * on-device token cache: it mints + caches the headless JWT (and persists
 * communityBaseUrl).
 *
 * The offscreen-cookie pre-warm half was REMOVED (Q3 resolved NEGATIVE): a
 * hidden/offscreen react-native-webview does NOT share the cookie store with
 * the visible Community WebView, so installing cookies offscreen could never
 * authenticate the visible WebView. Cookies are instead installed by the
 * visible WebView's own `/mobile-login` bootstrap on first open.
 *
 * THROTTLE: if the cached session is already fresh, this is a no-op — we do NOT
 * hammer Circle's session-token endpoint.
 */
export async function prewarmCircleSession(): Promise<void> {
  // Only mint if the cache is stale (throttle).
  if (isCircleSessionFresh(getCachedCircleSession())) {
    return;
  }

  if (mintInFlight) {
    await mintInFlight;
    return;
  }

  mintInFlight = mintAndCacheToken();
  try {
    await mintInFlight;
  }
  finally {
    mintInFlight = null;
  }
}

/**
 * Mints a Circle headless JWT via `POST /api/circle/session-token` (the same
 * endpoint and API client the Community hook uses) and warms the on-device
 * caches: the token+expiry in the shared session store and the community base
 * URL under its own MMKV key. Swallows errors (pre-warm is best-effort).
 */
async function mintAndCacheToken(): Promise<void> {
  try {
    await bootstrapMobileOrganization();

    const { data } = await client.post('/api/circle/session-token');
    const accessToken
      = typeof data?.accessToken === 'string' ? data.accessToken : null;
    const expiresAt
      = typeof data?.expiresAt === 'string' ? data.expiresAt : null;
    const responseBaseUrl = typeof data?.communityBaseUrl === 'string'
      ? data.communityBaseUrl
      : null;

    const communityBaseUrl
      = responseBaseUrl
        ?? getCircleCommunityBaseUrl(
          typeof data?.mode === 'string' ? data.mode : undefined,
          null,
        )
        ?? null;

    if (accessToken && expiresAt) {
      setCachedCircleSession({ accessToken, expiresAt });
    }
    if (communityBaseUrl) {
      void setItem<string>(COMMUNITY_BASE_URL_KEY, communityBaseUrl);
    }
  }
  catch (e) {
    // Best-effort: a failed pre-warm just means the next Community open mints
    // on demand (cold path), exactly as before this feature existed.
    console.warn('[circle-prewarm] mint failed:', e);
  }
}
