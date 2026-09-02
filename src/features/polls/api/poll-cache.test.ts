import type { Poll } from '@/features/polls/types';

import { applyVoteToFeedItems, applyVoteToPolls, reconcilePollInFeedItems, reconcilePollInPolls } from '@/features/polls/api/poll-cache';

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'p1',
    question: 'Which charity?',
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

describe('applyVoteToPolls', () => {
  it('marks the chosen option on the matching poll only', () => {
    const out = applyVoteToPolls([poll(), poll({ id: 'p2' })], 'p1', 'o2');
    expect(out[0].myVoteOptionId).toBe('o2');
    expect(out[1].myVoteOptionId).toBeNull();
  });
});

describe('reconcilePollInPolls', () => {
  it('replaces the poll with the server card', () => {
    const server = poll({ myVoteOptionId: 'o2', results: { total: 1, byOption: { o1: 0, o2: 1 } } });
    expect(reconcilePollInPolls([poll()], server)[0]).toEqual(server);
  });
});

describe('feed item patching', () => {
  const feedItem = { id: 'poll:p1', kind: 'poll' as const, title: 'Which charity?', poll: poll() };
  const postItem = { id: 'post-1', kind: 'post' as const, title: 'Hello' };
  it('patches only kind:poll items with the matching poll id', () => {
    const out = applyVoteToFeedItems([postItem, feedItem], 'p1', 'o1');
    expect(out[0]).toBe(postItem);
    expect((out[1] as typeof feedItem).poll.myVoteOptionId).toBe('o1');
  });
  it('reconciles the server card into the feed item', () => {
    const server = poll({ myVoteOptionId: 'o1', results: { total: 1, byOption: { o1: 1, o2: 0 } } });
    const out = reconcilePollInFeedItems([feedItem], server);
    expect((out[0] as typeof feedItem).poll).toEqual(server);
  });
});
