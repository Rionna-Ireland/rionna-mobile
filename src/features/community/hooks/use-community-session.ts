import { useCallback, useEffect, useState } from 'react';

import {
  buildCommunitySessionUrl,
  getDefaultCommunityLandingUrl,
} from '@/features/community/lib/circle-target';
import { client } from '@/lib/api/client';

type State = {
  communityUrl: string | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
};

export function useCommunitySession(initialUrl?: string): State {
  const [communityUrl, setCommunityUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const mintSession = useCallback(async () => {
    const fallbackUrl = initialUrl ?? getDefaultCommunityLandingUrl();
    if (!fallbackUrl) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/api/circle/session-token');
      const accessToken = data?.accessToken as string | undefined;

      const sessionUrl = accessToken
        ? buildCommunitySessionUrl({
            accessToken,
            redirectUrl: initialUrl,
            explicitMode: typeof data?.mode === 'string' ? data.mode : undefined,
            explicitBaseUrl: typeof data?.communityBaseUrl === 'string' ? data.communityBaseUrl : null,
          })
        : null;

      if (sessionUrl) {
        setCommunityUrl(sessionUrl);
      }
      else {
        setCommunityUrl(fallbackUrl);
      }
      setError(false);
    }
    catch {
      setCommunityUrl(fallbackUrl);
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
