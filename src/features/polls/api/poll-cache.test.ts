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

  it('returns the same array reference when the poll id is absent', () => {
    const polls = [poll({ id: 'p2' }), poll({ id: 'p3' })];
    expect(applyVoteToPolls(polls, 'p1', 'o2')).toBe(polls);
  });

  it('returns a new array reference when the poll id matches', () => {
    const polls = [poll()];
    expect(applyVoteToPolls(polls, 'p1', 'o2')).not.toBe(polls);
  });
});

describe('reconcilePollInPolls', () => {
  it('replaces the poll with the server card', () => {
    const server = poll({ myVoteOptionId: 'o2', results: { total: 1, byOption: { o1: 0, o2: 1 } } });
    expect(reconcilePollInPolls([poll()], server)[0]).toEqual(server);
  });

  it('returns the same array reference when the poll id is absent', () => {
    const polls = [poll({ id: 'p2' })];
    const server = poll({ id: 'p1', myVoteOptionId: 'o2' });
    expect(reconcilePollInPolls(polls, server)).toBe(polls);
  });

  it('returns a new array reference when the poll id matches', () => {
    const polls = [poll()];
    const server = poll({ myVoteOptionId: 'o2' });
    expect(reconcilePollInPolls(polls, server)).not.toBe(polls);
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

  it('applyVoteToFeedItems returns the same array reference when the poll id is absent', () => {
    const items = [postItem];
    expect(applyVoteToFeedItems(items, 'p1', 'o1')).toBe(items);
  });

  it('applyVoteToFeedItems returns a new array reference when the poll id matches', () => {
    const items = [feedItem];
    expect(applyVoteToFeedItems(items, 'p1', 'o1')).not.toBe(items);
  });

  it('reconcilePollInFeedItems returns the same array reference when the poll id is absent', () => {
    const items = [postItem];
    const server = poll({ id: 'p1', myVoteOptionId: 'o1' });
    expect(reconcilePollInFeedItems(items, server)).toBe(items);
  });

  it('reconcilePollInFeedItems returns a new array reference when the poll id matches', () => {
    const items = [feedItem];
    const server = poll({ myVoteOptionId: 'o1' });
    expect(reconcilePollInFeedItems(items, server)).not.toBe(items);
  });
});
