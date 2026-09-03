import type { MemberContentScope } from '@/features/member-content/types';
import type { CharityResult } from '@/features/paddock/types';

import { useQuery } from '@tanstack/react-query';

import { PADDOCK_QUERY_ROOT } from '@/features/paddock/types';
import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

function snapshotKey(scope: MemberContentScope) {
  return `charity-snapshot:${scope.organizationId}:${scope.memberId}`;
}

export async function fetchCharity(scope: MemberContentScope): Promise<CharityResult> {
  const { data } = await client.get<CharityResult>('/api/charity', {
    params: { organizationId: scope.organizationId },
  });
  if (data.ok !== true) {
    throw new Error('Charity unavailable');
  }
  void setItem(snapshotKey(scope), data);
  return data;
}

export function charityQueryKey(scope: MemberContentScope) {
  return [PADDOCK_QUERY_ROOT, 'charity', scope.organizationId, scope.memberId] as const;
}

export function useCharity(scope: MemberContentScope) {
  return useQuery({
    queryKey: charityQueryKey(scope),
    queryFn: () => fetchCharity(scope),
    // Offline-first: last good response hydrates immediately.
    initialData: () => getItem<CharityResult>(snapshotKey(scope)) ?? undefined,
    initialDataUpdatedAt: 0,
  });
}
