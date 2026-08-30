import type { ClubEvent, EventScope, EventsResult } from '@/features/events/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eventsQueryKey } from '@/features/events/api/use-events';
import { EVENTS_QUERY_ROOT } from '@/features/events/types';
import { client } from '@/lib/api/client';

type RsvpResponse
  = | { ok: true; going: boolean }
    | { ok: false; reason: 'not_a_member' | 'event_full' | 'rsvp_disabled' | 'circle_error' };

export class RsvpError extends Error {
  constructor(public reason: string) {
    super(`RSVP failed: ${reason}`);
  }
}

function flipEvent(event: ClubEvent, going: boolean): ClubEvent {
  const delta = going === event.rsvp.going ? 0 : going ? 1 : -1;
  return {
    ...event,
    rsvp: {
      ...event.rsvp,
      going,
      status: going ? 'yes' : null,
      count: Math.max(0, event.rsvp.count + delta),
    },
  };
}

export function useEventRsvp(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const scopes: EventScope[] = ['upcoming', 'past'];

  return useMutation({
    mutationFn: async ({ eventId, going }: { eventId: string; going: boolean }) => {
      const { data } = await client.post<RsvpResponse>('/api/circle/events/rsvp', {
        organizationId: scope.organizationId,
        eventId,
        going,
      });
      if (data.ok !== true) {
        throw new RsvpError(data.reason);
      }
      return data;
    },
    onMutate: async ({ eventId, going }) => {
      await queryClient.cancelQueries({ queryKey: [EVENTS_QUERY_ROOT] });
      const previous = scopes.map(eventScope => ({
        key: eventsQueryKey(scope, eventScope),
        data: queryClient.getQueryData<EventsResult>(eventsQueryKey(scope, eventScope)),
      }));
      for (const { key, data } of previous) {
        if (!data)
          continue;
        queryClient.setQueryData<EventsResult>(key, {
          ...data,
          events: data.events.map(event =>
            event.id === eventId ? flipEvent(event, going) : event,
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const { key, data } of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_ROOT] });
    },
  });
}
