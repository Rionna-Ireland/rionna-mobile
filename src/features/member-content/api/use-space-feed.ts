import type {
  MemberContentScope,
  MemberContentState,
  MemberFeedItem,
  MemberFeedResult,
} from '@/features/member-content/types';

import { useQuery } from '@tanstack/react-query';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

const FEED_LIMIT = 15;

export async function fetchSpaceFeed(
  scope: MemberContentScope,
  spaceId: string,
): Promise<MemberFeedItem[]> {
  const { data } = await client.get<MemberFeedResult>('/api/circle/member-feed', {
    params: {
      organizationId: scope.organizationId,
      page: 1,
      perPage: FEED_LIMIT,
      spaceId,
    },
  });
  if (data.ok !== true || !Array.isArray(data.items)) {
    throw new Error('Space feed unavailable');
  }
  return data.items.slice(0, FEED_LIMIT);
}

export function resolveSpaceFeedContentState({
  data,
  isError,
}: {
  data: MemberFeedItem[] | undefined;
  isError: boolean;
}): MemberContentState {
  if (isError || !data) {
    return 'unavailable';
  }
  return data.length === 0 ? 'empty' : 'fresh';
}

/**
 * Feed for one Circle space (a horse's discussion). Network-only — no MMKV
 * cache; the merged member feed remains the offline surface.
 */
export function useSpaceFeed(scope: MemberContentScope, spaceId: string) {
  const query = useQuery({
    queryKey: [
      MEMBER_CONTENT_QUERY_ROOT,
      'space-feed',
      scope.organizationId,
      scope.memberId,
      spaceId,
    ],
    queryFn: () => fetchSpaceFeed(scope, spaceId),
    enabled: spaceId.length > 0,
  });

  return {
    ...query,
    contentState: resolveSpaceFeedContentState({
      data: query.data,
      isError: query.isError,
    }),
  };
}
