import type { MemberContentScope } from '@/features/member-content/types';
import type { ActivePollsResult } from '@/features/polls/types';

import { useQuery } from '@tanstack/react-query';

import { POLLS_QUERY_ROOT } from '@/features/polls/types';
import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

function snapshotKey(scope: MemberContentScope) {
  return `polls-snapshot:${scope.organizationId}:${scope.memberId}`;
}

export async function fetchActivePolls(scope: MemberContentScope): Promise<ActivePollsResult> {
  const { data } = await client.get<ActivePollsResult>('/api/polls/active', {
    params: { organizationId: scope.organizationId },
  });
  if (data.ok !== true) {
    throw new Error('Polls unavailable');
  }
  void setItem(snapshotKey(scope), data);
  return data;
}

export function activePollsQueryKey(scope: MemberContentScope) {
  return [POLLS_QUERY_ROOT, 'active', scope.organizationId, scope.memberId] as const;
}

export function useActivePolls(scope: MemberContentScope) {
  return useQuery({
    queryKey: activePollsQueryKey(scope),
    queryFn: () => fetchActivePolls(scope),
    // Offline-first: last good response hydrates immediately (vote state may be
    // stale until the refetch lands).
    initialData: () => getItem<ActivePollsResult>(snapshotKey(scope)) ?? undefined,
    initialDataUpdatedAt: 0,
  });
}
