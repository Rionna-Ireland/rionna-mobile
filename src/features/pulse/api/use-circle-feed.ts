import type { CircleFeedItem } from '@/features/pulse/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';
import * as React from 'react';

import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

type CachedCircleFeed = {
  clubId: string;
  data: CircleFeedItem[];
  updatedAt: number;
};

const CIRCLE_FEED_CACHE_KEY = 'pulse.circle-feed.v3';
const CIRCLE_FEED_STALE_TIME = 5 * 60 * 1000;
const CIRCLE_FEED_CACHE_TIME = 7 * 24 * 60 * 60 * 1000;

function getCachedCircleFeed(clubId: string): CachedCircleFeed | null {
  const cached = getItem<CachedCircleFeed>(CIRCLE_FEED_CACHE_KEY);
  if (!cached || cached.clubId !== clubId || !Array.isArray(cached.data)) {
    return null;
  }

  return cached;
}

function persistCircleFeed(
  clubId: string,
  data: CircleFeedItem[],
  updatedAt: number,
) {
  setItem<CachedCircleFeed>(CIRCLE_FEED_CACHE_KEY, {
    clubId,
    data,
    updatedAt,
  }).catch(() => {});
}

export function useCircleFeed() {
  const clubId = Env.EXPO_PUBLIC_CLUB_ID;
  const cached = React.useMemo(() => getCachedCircleFeed(clubId), [clubId]);
  const lastPersistedAtRef = React.useRef(cached?.updatedAt ?? 0);
  const query = useQuery({
    queryKey: ['circle-feed', clubId],
    queryFn: async () => {
      const { data } = await client.get('/api/circle/feed', {
        params: { organizationId: clubId, limit: 10 },
      });
      return data as CircleFeedItem[];
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: CIRCLE_FEED_STALE_TIME,
    gcTime: CIRCLE_FEED_CACHE_TIME,
    networkMode: 'offlineFirst',
  });

  React.useEffect(() => {
    if (query.data && query.dataUpdatedAt > lastPersistedAtRef.current) {
      lastPersistedAtRef.current = query.dataUpdatedAt;
      persistCircleFeed(clubId, query.data, query.dataUpdatedAt);
    }
  }, [clubId, query.data, query.dataUpdatedAt]);

  return {
    ...query,
    cachedAt: cached?.updatedAt ?? null,
    hasCachedData: Boolean(cached?.data.length),
  };
}
