import type { MemberContentScope } from '@/features/member-content/types';
import type { OffersResult } from '@/features/paddock/types';

import { useQuery } from '@tanstack/react-query';

import { PADDOCK_QUERY_ROOT } from '@/features/paddock/types';
import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

function snapshotKey(scope: MemberContentScope) {
  return `offers-snapshot:${scope.organizationId}:${scope.memberId}`;
}

export async function fetchOffers(scope: MemberContentScope): Promise<OffersResult> {
  const { data } = await client.get<OffersResult>('/api/paddock/offers', {
    params: { organizationId: scope.organizationId },
  });
  if (data.ok !== true) {
    throw new Error('Offers unavailable');
  }
  void setItem(snapshotKey(scope), data);
  return data;
}

export function offersQueryKey(scope: MemberContentScope) {
  return [PADDOCK_QUERY_ROOT, 'offers', scope.organizationId, scope.memberId] as const;
}

export function useOffers(scope: MemberContentScope) {
  return useQuery({
    queryKey: offersQueryKey(scope),
    queryFn: () => fetchOffers(scope),
    // Offline-first: last good response hydrates immediately.
    initialData: () => getItem<OffersResult>(snapshotKey(scope)) ?? undefined,
    initialDataUpdatedAt: 0,
  });
}
