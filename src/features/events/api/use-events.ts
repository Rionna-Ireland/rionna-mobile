import type { ClubEvent, EventScope, EventsResult } from '@/features/events/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useQuery } from '@tanstack/react-query';

import { EVENTS_QUERY_ROOT } from '@/features/events/types';
import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

function snapshotKey(scope: MemberContentScope, eventScope: EventScope) {
  return `events-snapshot:${scope.organizationId}:${scope.memberId}:${eventScope}`;
}

export async function fetchEvents(
  scope: MemberContentScope,
  eventScope: EventScope,
): Promise<EventsResult> {
  const { data } = await client.get<EventsResult>('/api/circle/events', {
    params: { organizationId: scope.organizationId, scope: eventScope },
  });
  if (data.ok !== true) {
    throw new Error('Events unavailable');
  }
  void setItem(snapshotKey(scope, eventScope), data);
  return data;
}

export function eventsQueryKey(scope: MemberContentScope, eventScope: EventScope) {
  return [EVENTS_QUERY_ROOT, scope.organizationId, scope.memberId, eventScope] as const;
}

export function useEvents(scope: MemberContentScope, eventScope: EventScope) {
  return useQuery({
    queryKey: eventsQueryKey(scope, eventScope),
    queryFn: () => fetchEvents(scope, eventScope),
    // Offline-first: last good response hydrates immediately; the network
    // refetch replaces it (or errors quietly on poor signal — the snapshot
    // keeps the tab populated either way).
    initialData: () => getItem<EventsResult>(snapshotKey(scope, eventScope)) ?? undefined,
    initialDataUpdatedAt: 0,
  });
}

export function findEventById(
  results: (EventsResult | undefined)[],
  eventId: string,
): ClubEvent | undefined {
  for (const result of results) {
    const match = result?.events.find(event => event.id === eventId);
    if (match)
      return match;
  }
  return undefined;
}
