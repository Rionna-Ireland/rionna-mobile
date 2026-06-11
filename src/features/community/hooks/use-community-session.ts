import { useCallback, useEffect, useState } from 'react';

import {
  getCachedCircleSession,
  isCircleSessionFresh,
  setCachedCircleSession,
} from '@/features/community/lib/circle-session-store';
import {
  getCircleCommunityBaseUrl,
  getCircleMode,
  getDefaultCommunityLandingUrl,
} from '@/features/community/lib/circle-target';
import { client } from '@/lib/api/client';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';
import { getItem, setItem } from '@/lib/storage';

// The cached `communityBaseUrl` lives in its own MMKV key (not in the
// circle-session-store, whose CachedCircleSession shape is fixed to
// token+expiry). It is only ever read on a warm open, where the token comes
// from the cache and we have no mint response to derive the base URL from.
const COMMUNITY_BASE_URL_KEY = 'circle.communityBaseUrl.v1';

function getCachedCommunityBaseUrl(): string | null {
  const value = getItem<string>(COMMUNITY_BASE_URL_KEY);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function setCachedCommunityBaseUrl(baseUrl: string): void {
  void setItem<string>(COMMUNITY_BASE_URL_KEY, baseUrl);
}

// S0-03 (approach C): the hook mints a Circle headless JWT and returns it
// alongside the community base URL. The WebView component uses the JWT to
// `fetch('/api/headless/v1/cookies', …)` from within its own JS context,
// which installs Circle's `skip_confirmed_password` cookie first-party to
// the community origin. We cannot use @react-native-cookies/cookies because
// it is not New-Architecture-compatible (Expo SDK 54 runs new arch on).
//
// @see Architecture/specs/S0-03-circle-cookie-auth.md §"Implementation deltas"

type State = {
  communityBaseUrl: string | null;
  accessToken: string | null;
  bootstrapUrl: string | null;
  postBootstrapPath: string;
  loading: boolean;
  error: boolean;
  errorMessage: string | null;
  /** True when the token+base URL came from a fresh on-device cache hit (no mint). */
  warm: boolean;
  refresh: () => void;
};

type SessionPayload = {
  accessToken: string | null;
  communityBaseUrl: string | null;
};

function getErrorMessage(e: unknown): string | null {
  if (e && typeof e === 'object') {
    const response
      = (e as {
        response?: { data?: { message?: string; error?: string } };
      }).response;
    return response?.data?.message ?? response?.data?.error ?? null;
  }
  return null;
}

async function fetchSessionPayload(): Promise<SessionPayload> {
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

  if (!communityBaseUrl) {
    throw new Error('Could not resolve communityBaseUrl');
  }

  // Persist the token+expiry (shared store) and the base URL (local key) so
  // the next open can go warm and skip this round-trip entirely.
  if (accessToken && expiresAt) {
    setCachedCircleSession({ accessToken, expiresAt });
  }
  setCachedCommunityBaseUrl(communityBaseUrl);

  return {
    accessToken,
    communityBaseUrl,
  };
}

function getFallbackPostBootstrapPath(initialDeepLinkUrl?: string): string {
  if (!initialDeepLinkUrl)
    return '/feed';

  if (initialDeepLinkUrl.startsWith('/'))
    return initialDeepLinkUrl;

  if (initialDeepLinkUrl.startsWith('http')) {
    const url = new URL(initialDeepLinkUrl);
    return url.pathname + (url.search || '');
  }

  return '/feed';
}

function logCommunitySessionMode(
  communityBaseUrl: string | null,
  accessToken: string | null,
) {
  if (!communityBaseUrl)
    return;

  console.log('[useCommunitySession] mode', getCircleMode(), 'base', communityBaseUrl, 'hasToken', !!accessToken);
}

// Cache-first read: returns the warm payload when we have BOTH a fresh cached
// token and a cached base URL, else null (caller falls back to a network mint).
function readWarmSession(): SessionPayload | null {
  const cached = getCachedCircleSession();
  const cachedBaseUrl = getCachedCommunityBaseUrl();
  if (cachedBaseUrl && isCircleSessionFresh(cached) && cached) {
    return {
      accessToken: cached.accessToken,
      communityBaseUrl: cachedBaseUrl,
    };
  }
  return null;
}

type SessionErrorPatch = {
  communityBaseUrl: string | null;
  error: boolean;
  errorMessage: string | null;
};

// Maps a thrown mint error to the state patch the hook applies. Known
// provisioning/org errors surface a message; anything else (network/5xx)
// falls back to the unauthenticated community landing and lets the WebView's
// own error state surface a hard failure.
function mapSessionError(e: unknown): SessionErrorPatch {
  const msg = getErrorMessage(e);

  if (msg === 'No active organization') {
    return {
      communityBaseUrl: null,
      error: true,
      errorMessage:
        'The session is missing the configured club context. Sign out and sign back in.',
    };
  }
  if (msg?.includes('not yet provisioned')) {
    return {
      communityBaseUrl: null,
      error: true,
      errorMessage: 'Membership not yet active — check back in a moment.',
    };
  }
  return {
    communityBaseUrl: getDefaultCommunityLandingUrl() ?? null,
    error: false,
    errorMessage: null,
  };
}

export function useCommunitySession(initialDeepLinkUrl?: string): State {
  const [communityBaseUrl, setCommunityBaseUrl] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warm, setWarm] = useState(false);

  const acquireSession = useCallback(async (forceMint: boolean) => {
    setLoading(true);
    setError(false);
    setErrorMessage(null);
    setAccessToken(null);
    setWarm(false);

    // Cache-first: if we have a fresh cached token AND a cached base URL,
    // serve from cache and skip the mint round-trip entirely. `refresh`
    // forces a network mint to bypass this.
    const warmSession = forceMint ? null : readWarmSession();
    if (warmSession) {
      setAccessToken(warmSession.accessToken);
      setCommunityBaseUrl(warmSession.communityBaseUrl);
      setWarm(true);
      setLoading(false);
      return;
    }

    try {
      const session = await fetchSessionPayload();
      setAccessToken(session.accessToken);
      setCommunityBaseUrl(session.communityBaseUrl);
      setError(false);
      setErrorMessage(null);
    }
    catch (e) {
      const patch = mapSessionError(e);
      setAccessToken(null);
      setCommunityBaseUrl(patch.communityBaseUrl);
      setError(patch.error);
      setErrorMessage(patch.errorMessage);
    }
    finally {
      setLoading(false);
    }
  }, []);

  // refresh() forces a network mint, bypassing the cache (e.g. retry after
  // an error, or to pick up a rotated token).
  const refresh = useCallback(() => {
    void acquireSession(true);
  }, [acquireSession]);

  useEffect(() => {
    void acquireSession(false);
  }, [acquireSession]);

  // Bootstrap URL: the WebView's initial landing page for the JS-injection
  // bootstrap. We want a URL that (a) is on the community origin (so the
  // fetch to /api/headless/v1/cookies is same-origin and Set-Cookie installs
  // first-party), (b) returns 200 HTML with a JS context (not 302), and
  // (c) is stable/unauthenticated.
  //
  // `/mobile-login` is a Circle Custom Page we provisioned specifically for
  // this bootstrap. It's public (no auth redirect), HTML, on the community
  // origin, and stable against Circle product changes — unlike `/404` which
  // depends on Rails default behaviour and could break if Circle ships a
  // branded 404. The user never sees the page: the bootstrap script hides
  // the body via `visibility: hidden` and navigates away via
  // `window.location.replace(postBootstrapPath)` as soon as cookies install.
  //
  // If renaming the page in Circle admin, update this constant.
  //
  // Post-bootstrap path: where we ultimately want to land. Deep links
  // override; otherwise `/feed` (Circle's canonical authenticated landing
  // page for members on this community). We deliberately do NOT use `/` or
  // `/home`: both go through Circle routing middleware that on this community
  // sends us back to `/mobile-login` (our bootstrap page). `/feed` is the
  // stable destination.
  const postBootstrapPath = getFallbackPostBootstrapPath(initialDeepLinkUrl);

  // Entry-URL selection (S6-03 — warm→/feed shortcut REVERTED 2026-06-10).
  // We ALWAYS enter via `/mobile-login`. That Circle Custom Page runs our
  // injected bootstrap, which installs/verifies the first-party auth cookies and
  // THEN `window.location.replace(postBootstrapPath)` (default `/feed`, or the
  // deep-link target). Deep links are preserved by this single path.
  //
  // Why reverted: the earlier "warm → /feed direct" shortcut assumed Circle
  // cookies were already installed (via pre-warm B4 or the persisted store).
  // When they aren't, `/feed` is unauthenticated → Circle redirects to a login
  // wall, and the bootstrap can't self-heal there (it only acts on
  // `/mobile-login`). Cookie presence isn't detectable from RN (httpOnly), so we
  // do not gamble on it. The B1/B2 token cache still removes the per-open backend
  // mint — that is the safe latency win and is unaffected by this revert.
  // (`warm` is retained for the token-cache fast path, not for skipping bootstrap.)
  const bootstrapUrl = communityBaseUrl ? `${communityBaseUrl}/mobile-login` : null;
  logCommunitySessionMode(communityBaseUrl, accessToken);

  return {
    communityBaseUrl,
    accessToken,
    bootstrapUrl,
    postBootstrapPath,
    loading,
    error,
    errorMessage,
    warm,
    refresh,
  };
}
