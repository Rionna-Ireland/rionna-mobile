import type { ListPostableSpacesResult } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

const COMMUNITY_POSTING_QUERY_ROOT = 'community-posting';

function snapshotKey(scope: MemberContentScope) {
  return `postable-spaces-snapshot:${scope.organizationId}:${scope.memberId}`;
}

export async function fetchPostableSpaces(
  scope: MemberContentScope,
): Promise<ListPostableSpacesResult> {
  const { data } = await client.get<ListPostableSpacesResult>('/api/community/postable-spaces', {
    params: { organizationId: scope.organizationId },
  });
  if (data.ok !== true) {
    throw new Error('Postable spaces unavailable');
  }
  void setItem(snapshotKey(scope), data);
  return data;
}

export function postableSpacesQueryKey(scope: MemberContentScope) {
  return [COMMUNITY_POSTING_QUERY_ROOT, 'postable-spaces', scope.organizationId, scope.memberId] as const;
}

export function usePostableSpaces(scope: MemberContentScope) {
  return useQuery({
    queryKey: postableSpacesQueryKey(scope),
    queryFn: () => fetchPostableSpaces(scope),
    // Offline-first: last good response hydrates immediately.
    initialData: () => getItem<ListPostableSpacesResult>(snapshotKey(scope)) ?? undefined,
    initialDataUpdatedAt: 0,
  });
}
