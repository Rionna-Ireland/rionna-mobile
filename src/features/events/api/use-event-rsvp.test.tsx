import type { ClubEvent, EventsResult } from '@/features/events/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { RsvpError, useEventRsvp } from '@/features/events/api/use-event-rsvp';
import { eventsQueryKey } from '@/features/events/api/use-events';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  client: { post: jest.fn() },
}));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function clubEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: 'event-1',
    spaceId: 'space-1',
    title: 'Race Day',
    startsAt: '2026-09-01T10:00:00.000Z',
    endsAt: '2026-09-01T12:00:00.000Z',
    locationType: 'in_person',
    inPersonLocation: 'The Curragh',
    virtualLocationUrl: null,
    coverImageUrl: null,
    bodyText: null,
    tiptapDoc: null,
    embeds: {},
    inlineAttachments: [],
    url: null,
    rsvp: {
      going: false,
      status: null,
      count: 3,
      limit: null,
      disabled: false,
      full: false,
    },
    ...overrides,
  };
}

function eventsResult(overrides: Partial<EventsResult> = {}): EventsResult {
  return {
    ok: true,
    configured: true,
    events: [clubEvent()],
    ...overrides,
  };
}

describe('useEventRsvp', () => {
  const UPCOMING_KEY = eventsQueryKey(SCOPE, 'upcoming');
  const PAST_KEY = eventsQueryKey(SCOPE, 'past');

  beforeEach(() => jest.clearAllMocks());

  function seededClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
    });
    queryClient.setQueryData(UPCOMING_KEY, eventsResult());
    queryClient.setQueryData(PAST_KEY, eventsResult({ events: [clubEvent({ id: 'event-2' })] }));
    return queryClient;
  }

  it('optimistically flips going to true and bumps the count in both scope caches before the mutation resolves', async () => {
    let resolvePost: (value: { data: { ok: true; going: boolean } }) => void;
    mockPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const queryClient = seededClient();
    const { result } = renderHook(() => useEventRsvp(SCOPE), { wrapper: wrapper(queryClient) });

    result.current.mutate({ eventId: 'event-1', going: true });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    const upcoming = queryClient.getQueryData<EventsResult>(UPCOMING_KEY);
    expect(upcoming?.events[0]).toMatchObject({
      rsvp: expect.objectContaining({ going: true, count: 4, status: 'yes' }),
    });

    resolvePost!({ data: { ok: true, going: true } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back both scope caches when the server rejects the mutation', async () => {
    mockPost.mockResolvedValue({ data: { ok: false, reason: 'event_full' } });

    const queryClient = seededClient();
    const { result } = renderHook(() => useEventRsvp(SCOPE), { wrapper: wrapper(queryClient) });

    result.current.mutate({ eventId: 'event-1', going: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const upcoming = queryClient.getQueryData<EventsResult>(UPCOMING_KEY);
    expect(upcoming?.events[0]).toMatchObject({
      rsvp: expect.objectContaining({ going: false, count: 3 }),
    });
    expect(result.current.error).toBeInstanceOf(RsvpError);
    expect((result.current.error as RsvpError).reason).toBe('event_full');
  });

  it('rolls back on a network error', async () => {
    mockPost.mockRejectedValue(new Error('network down'));

    const queryClient = seededClient();
    const { result } = renderHook(() => useEventRsvp(SCOPE), { wrapper: wrapper(queryClient) });

    result.current.mutate({ eventId: 'event-1', going: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const upcoming = queryClient.getQueryData<EventsResult>(UPCOMING_KEY);
    expect(upcoming?.events[0]).toMatchObject({
      rsvp: expect.objectContaining({ going: false, count: 3 }),
    });
  });

  it('invalidates both the upcoming and past event queries once settled', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, going: true } });

    const queryClient = seededClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useEventRsvp(SCOPE), { wrapper: wrapper(queryClient) });

    result.current.mutate({ eventId: 'event-1', going: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});
