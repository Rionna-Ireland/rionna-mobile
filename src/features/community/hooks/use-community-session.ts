import { useCallback, useEffect, useState } from 'react';

import {
  getCircleCommunityBaseUrl,
  getCircleMode,
  getDefaultCommunityLandingUrl,
} from '@/features/community/lib/circle-target';
import { client } from '@/lib/api/client';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';

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

export function useCommunitySession(initialDeepLinkUrl?: string): State {
  const [communityBaseUrl, setCommunityBaseUrl] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mintSession = useCallback(async () => {
    setLoading(true);
    setError(false);
    setErrorMessage(null);
    setAccessToken(null);

    try {
      const session = await fetchSessionPayload();
      setAccessToken(session.accessToken);
      setCommunityBaseUrl(session.communityBaseUrl);
      setError(false);
      setErrorMessage(null);
    }
    catch (e) {
      const msg = getErrorMessage(e);

      if (msg === 'No active organization') {
        setCommunityBaseUrl(null);
        setAccessToken(null);
        setError(true);
        setErrorMessage(
          'The session is missing the configured club context. Sign out and sign back in.',
        );
      }
      else if (msg?.includes('not yet provisioned')) {
        setCommunityBaseUrl(null);
        setAccessToken(null);
        setError(true);
        setErrorMessage(
          'Membership not yet active — check back in a moment.',
        );
      }
      else {
        // Network / 5xx / unknown — still try to show the community
        // base without auth as a last resort. If Circle rejects, the
        // WebView's own error state surfaces it.
        const fallback = getDefaultCommunityLandingUrl() ?? null;
        setCommunityBaseUrl(fallback);
        setAccessToken(null);
        setError(false);
      }
    }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mintSession();
  }, [mintSession]);

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
  const bootstrapUrl
    = communityBaseUrl ? `${communityBaseUrl}/mobile-login` : null;

  // Post-bootstrap path: where the bootstrap script navigates after cookies
  // install. Deep links override; otherwise we land directly at `/feed`
  // (Circle's canonical authenticated landing page for members on this
  // community). We deliberately do NOT use `/` or `/home`: both go through
  // Circle routing middleware that on this community sends us back to
  // `/mobile-login` (our bootstrap page). `/feed` is the stable destination.
  const postBootstrapPath = getFallbackPostBootstrapPath(initialDeepLinkUrl);
  logCommunitySessionMode(communityBaseUrl, accessToken);

  return {
    communityBaseUrl,
    accessToken,
    bootstrapUrl,
    postBootstrapPath,
    loading,
    error,
    errorMessage,
    refresh: mintSession,
  };
}
