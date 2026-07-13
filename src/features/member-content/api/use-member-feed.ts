import type {
  MemberContentScope,
  MemberContentState,
  MemberFeedItem,
  MemberFeedResult,
} from '@/features/member-content/types';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  getCachedMemberFeed,
  MEMBER_CONTENT_CACHE_TTL_MS,
  setCachedMemberFeed,
} from '@/features/member-content/cache/member-content-cache';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

const FEED_LIMIT = 15;

type MemberFeedStateInput = {
  data: MemberFeedItem[] | undefined;
  isError: boolean;
  isFetchedAfterMount: boolean;
  hasSavedData: boolean;
};

export function resolveMemberFeedContentState({
  data,
  isError,
  isFetchedAfterMount,
  hasSavedData,
}: MemberFeedStateInput): MemberContentState {
  if (isError) {
    return data && hasSavedData ? 'saved' : 'unavailable';
  }
  if (!data) {
    return 'unavailable';
  }
  if (data.length === 0) {
    return 'empty';
  }
  return hasSavedData && !isFetchedAfterMount ? 'saved' : 'fresh';
}

export async function fetchMemberFeed(
  scope: MemberContentScope,
): Promise<MemberFeedItem[]> {
  const { data } = await client.get<MemberFeedResult>('/api/circle/member-feed', {
    params: {
      organizationId: scope.organizationId,
      page: 1,
      perPage: FEED_LIMIT,
    },
  });
  if (data.ok !== true || !Array.isArray(data.items)) {
    throw new Error('Member feed unavailable');
  }
  return data.items.slice(0, FEED_LIMIT);
}

export function useMemberFeed(scope: MemberContentScope) {
  const { memberId, organizationId } = scope;
  const cached = React.useMemo(
    () => getCachedMemberFeed({ memberId, organizationId }),
    [memberId, organizationId],
  );
  const query = useQuery({
    queryKey: [
      MEMBER_CONTENT_QUERY_ROOT,
      'feed',
      organizationId,
      memberId,
    ],
    queryFn: () => fetchMemberFeed({ memberId, organizationId }),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.fetchedAt,
    staleTime: 0,
    gcTime: MEMBER_CONTENT_CACHE_TTL_MS,
    networkMode: 'offlineFirst',
  });

  React.useEffect(() => {
    if (query.isFetchedAfterMount && query.isSuccess && query.data) {
      setCachedMemberFeed({ memberId, organizationId }, query.data, query.dataUpdatedAt);
    }
  }, [
    query.data,
    query.dataUpdatedAt,
    query.isFetchedAfterMount,
    query.isSuccess,
    memberId,
    organizationId,
  ]);

  const contentState = resolveMemberFeedContentState({
    data: query.data,
    isError: query.isError,
    isFetchedAfterMount: query.isFetchedAfterMount,
    hasSavedData: cached !== null,
  });

  return {
    ...query,
    contentState,
    savedAt: contentState === 'saved' ? (cached?.fetchedAt ?? null) : null,
  };
}
