import type { ClubEvent, EventsResult } from '@/features/events/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useEvents } from '@/features/events/api/use-events';
import { client } from '@/lib/api/client';
import { getItem, setItem } from '@/lib/storage';

jest.mock('@/lib/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockStore = new Map<string, unknown>();

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn((key: string) => mockStore.get(key) ?? null),
  setItem: jest.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
  }),
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const mockSetItem = setItem as jest.MockedFunction<typeof setItem>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
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

describe('useEvents', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('fetches and returns upcoming events', async () => {
    const result = eventsResult();
    mockGet.mockResolvedValue({ data: result });

    const { result: hook } = renderHook(() => useEvents(SCOPE, 'upcoming'), { wrapper });

    await waitFor(() => expect(hook.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/api/circle/events', {
      params: { organizationId: 'org-1', scope: 'upcoming' },
    });
    expect(hook.current.data?.events[0]?.id).toBe('event-1');
  });

  it('is an error state on ok:false', async () => {
    mockGet.mockResolvedValue({ data: { ok: false, configured: false, events: [] } });

    const { result: hook } = renderHook(() => useEvents(SCOPE, 'upcoming'), { wrapper });

    await waitFor(() => expect(hook.current.isError).toBe(true));
  });

  it('writes a snapshot to storage on success', async () => {
    const result = eventsResult();
    mockGet.mockResolvedValue({ data: result });

    const { result: hook } = renderHook(() => useEvents(SCOPE, 'upcoming'), { wrapper });

    await waitFor(() => expect(hook.current.isSuccess).toBe(true));

    expect(mockSetItem).toHaveBeenCalledWith(
      'events-snapshot:org-1:member-1:upcoming',
      result,
    );
  });

  it('hydrates from the offline snapshot and keeps it while the refetch fails', async () => {
    const snapshot = eventsResult({ events: [clubEvent({ id: 'cached-event' })] });
    mockStore.set('events-snapshot:org-1:member-1:upcoming', snapshot);
    mockGet.mockRejectedValue(new Error('network down'));

    const { result: hook } = renderHook(() => useEvents(SCOPE, 'upcoming'), { wrapper });

    expect(hook.current.data).toEqual(snapshot);

    await waitFor(() => expect(hook.current.isError).toBe(true));

    expect(hook.current.data).toEqual(snapshot);
    expect(getItem).toHaveBeenCalledWith('events-snapshot:org-1:member-1:upcoming');
  });
});
