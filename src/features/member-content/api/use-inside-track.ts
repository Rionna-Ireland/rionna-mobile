import type {
  InsideTrackResult,
  MemberContentScope,
} from '@/features/member-content/types';

import { useQuery } from '@tanstack/react-query';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

export type InsideTrackContentState = 'fresh' | 'empty' | 'unavailable';

export async function fetchInsideTrack(
  scope: MemberContentScope,
): Promise<InsideTrackResult> {
  const { data } = await client.get<InsideTrackResult>('/api/circle/inside-track', {
    params: { organizationId: scope.organizationId },
  });
  if (data.ok !== true) {
    throw new Error('Inside Track unavailable');
  }
  return data;
}

export function resolveInsideTrackContentState({
  data,
  isError,
}: {
  data: InsideTrackResult | undefined;
  isError: boolean;
}): InsideTrackContentState {
  if (isError || !data) {
    return 'unavailable';
  }
  return data.pinned.length + data.latest.length === 0 ? 'empty' : 'fresh';
}

export function useInsideTrack(scope: MemberContentScope) {
  const query = useQuery({
    queryKey: [
      MEMBER_CONTENT_QUERY_ROOT,
      'inside-track',
      scope.organizationId,
      scope.memberId,
    ],
    queryFn: () => fetchInsideTrack(scope),
  });

  return {
    ...query,
    contentState: resolveInsideTrackContentState({
      data: query.data,
      isError: query.isError,
    }),
  };
}
