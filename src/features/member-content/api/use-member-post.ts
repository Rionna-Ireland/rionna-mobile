import type {
  MemberContentScope,
  MemberContentState,
  MemberPostDetail,
} from '@/features/member-content/types';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  getCachedMemberPost,
  MEMBER_CONTENT_CACHE_TTL_MS,
  setCachedMemberPost,
} from '@/features/member-content/cache/member-content-cache';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

export function resolveMemberPostContentState(
  data: MemberPostDetail | undefined,
  isError: boolean,
  isFetchedAfterMount: boolean,
): MemberContentState {
  if (!data) {
    return 'unavailable';
  }
  return isError || !isFetchedAfterMount ? 'saved' : 'fresh';
}

export async function fetchMemberPost(
  scope: MemberContentScope,
  spaceId: string,
  postId: string,
): Promise<MemberPostDetail> {
  const { data } = await client.get<MemberPostDetail | null>(
    '/api/circle/member-post',
    {
      params: {
        organizationId: scope.organizationId,
        spaceId,
        postId,
      },
    },
  );
  if (!data) {
    throw new Error('Member post unavailable');
  }
  return data;
}

export function useMemberPost(
  scope: MemberContentScope,
  spaceId: string,
  postId: string,
) {
  const { memberId, organizationId } = scope;
  const cached = React.useMemo(
    () => getCachedMemberPost({ memberId, organizationId, postId, spaceId }),
    [memberId, organizationId, postId, spaceId],
  );
  const query = useQuery({
    queryKey: [
      MEMBER_CONTENT_QUERY_ROOT,
      'post',
      organizationId,
      memberId,
      spaceId,
      postId,
    ],
    queryFn: () => fetchMemberPost({ memberId, organizationId }, spaceId, postId),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.fetchedAt,
    staleTime: 0,
    gcTime: MEMBER_CONTENT_CACHE_TTL_MS,
    networkMode: 'offlineFirst',
  });

  React.useEffect(() => {
    if (query.isFetchedAfterMount && query.isSuccess && query.data) {
      setCachedMemberPost(
        { memberId, organizationId, postId, spaceId },
        query.data,
        query.dataUpdatedAt,
      );
    }
  }, [
    query.data,
    query.dataUpdatedAt,
    query.isFetchedAfterMount,
    query.isSuccess,
    memberId,
    organizationId,
    postId,
    spaceId,
  ]);

  const contentState = resolveMemberPostContentState(
    query.data,
    query.isError,
    query.isFetchedAfterMount,
  );

  return {
    ...query,
    contentState,
    savedAt: contentState === 'saved' ? (cached?.fetchedAt ?? null) : null,
  };
}
