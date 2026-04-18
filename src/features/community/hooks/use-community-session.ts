import Env from 'env';
import { useCallback, useEffect, useState } from 'react';

import { client } from '@/lib/api/client';

type State = {
  communityUrl: string | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
};

function buildAuthedUrl(domain: string, accessToken: string, redirect?: string) {
  const base = `https://${domain}/session/cookies?access_token=${encodeURIComponent(accessToken)}`;
  return redirect
    ? `${base}&redirect=${encodeURIComponent(redirect)}`
    : base;
}

export function useCommunitySession(initialUrl?: string): State {
  const [communityUrl, setCommunityUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const mintSession = useCallback(async () => {
    const domain = Env.EXPO_PUBLIC_COMMUNITY_DOMAIN;
    if (!domain) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/api/circle/session-token');
      const accessToken = data?.accessToken as string | undefined;
      const isMockToken = accessToken?.startsWith('mock-access-token-');

      if (accessToken && !isMockToken) {
        setCommunityUrl(buildAuthedUrl(domain, accessToken, initialUrl));
      }
      else {
        // No real token (Circle not configured, mock mode) -- load raw domain
        // to avoid Circle/Cloudflare rejecting a bogus access_token.
        setCommunityUrl(initialUrl ?? `https://${domain}`);
      }
      setError(false);
    }
    catch {
      // Fallback: load community domain directly without auth (API unreachable)
      setCommunityUrl(initialUrl ?? `https://${domain}`);
      setError(false);
    }
    finally {
      setLoading(false);
    }
  }, [initialUrl]);

  useEffect(() => {
    mintSession();
  }, [mintSession]);

  return { communityUrl, loading, error, refresh: mintSession };
}
