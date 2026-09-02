import type { Poll } from '@/features/polls/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { activePollsQueryKey } from '@/features/polls/api/use-active-polls';
import { usePollVote } from '@/features/polls/api/use-poll-vote';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(() => null), setItem: jest.fn() }));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };
const POLLS_KEY = activePollsQueryKey(SCOPE);
const FEED_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'feed', 'org-1', 'member-1'];
const OTHER_FEED_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'feed', 'org-1', 'other'];

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'p1',
    question: 'Q',
    scope: 'club',
    circleSpaceId: null,
    status: 'open',
    publishedAt: '2026-09-01T09:00:00.000Z',
    closesAt: null,
    options: [{ id: 'o1', label: 'A', sortOrder: 0 }, { id: 'o2', label: 'B', sortOrder: 1 }],
    myVoteOptionId: null,
    results: null,
    ...overrides,
  };
}

function seeded() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(POLLS_KEY, { ok: true, polls: [poll()] });
  queryClient.setQueryData(FEED_KEY, [{ id: 'poll:p1', kind: 'poll', title: 'Q', poll: poll() }]);
  const otherFeed = [{ id: 'post-1', kind: 'post', title: 'Hello' }];
  queryClient.setQueryData(OTHER_FEED_KEY, otherFeed);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper, otherFeed };
}

describe('usePollVote', () => {
  it('optimistically marks the option in both caches, then reconciles with the server card', async () => {
    const { queryClient, wrapper, otherFeed } = seeded();
    let resolve!: (v: { data: unknown }) => void;
    mockPost.mockReturnValue(new Promise((r) => {
      resolve = r;
    }));
    const { result } = renderHook(() => usePollVote(SCOPE), { wrapper });

    result.current.vote({ pollId: 'p1', optionId: 'o2' });
    await waitFor(() => expect(result.current.pendingPollId).toBe('p1'));
    expect(queryClient.getQueryData<{ polls: Poll[] }>(POLLS_KEY)?.polls[0].myVoteOptionId).toBe('o2');
    expect(queryClient.getQueryData(OTHER_FEED_KEY)).toBe(otherFeed);

    const server = poll({ myVoteOptionId: 'o2', results: { total: 1, byOption: { o1: 0, o2: 1 } } });
    resolve({ data: { ok: true, poll: server } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<{ polls: Poll[] }>(POLLS_KEY)?.polls[0]).toEqual(server);
    expect((queryClient.getQueryData<{ poll: Poll }[]>(FEED_KEY) ?? [])[0].poll).toEqual(server);
    expect(mockPost).toHaveBeenCalledWith('/api/polls/vote', { organizationId: 'org-1', pollId: 'p1', optionId: 'o2' });
    expect(queryClient.getQueryData(OTHER_FEED_KEY)).toBe(otherFeed);
  });

  it('rolls back on ok:false', async () => {
    const { queryClient, wrapper } = seeded();
    mockPost.mockResolvedValue({ data: { ok: false, reason: 'closed' } });
    const { result } = renderHook(() => usePollVote(SCOPE), { wrapper });
    result.current.vote({ pollId: 'p1', optionId: 'o2' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<{ polls: Poll[] }>(POLLS_KEY)?.polls[0].myVoteOptionId).toBeNull();
  });

  it('rolls back both caches on a rejected vote request', async () => {
    const { queryClient, wrapper } = seeded();
    mockPost.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => usePollVote(SCOPE), { wrapper });
    result.current.vote({ pollId: 'p1', optionId: 'o2' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<{ polls: Poll[] }>(POLLS_KEY)?.polls[0].myVoteOptionId).toBeNull();
    expect((queryClient.getQueryData<{ poll: Poll }[]>(FEED_KEY) ?? [])[0].poll.myVoteOptionId).toBeNull();
  });
});
