import type { Poll } from '@/features/polls/types';

type PollFeedItemLike = { id: string; kind: string; poll?: Poll };

export function applyVoteToPolls(polls: Poll[], pollId: string, optionId: string): Poll[] {
  return polls.map(p => (p.id === pollId ? { ...p, myVoteOptionId: optionId } : p));
}

export function reconcilePollInPolls(polls: Poll[], server: Poll): Poll[] {
  return polls.map(p => (p.id === server.id ? server : p));
}

export function applyVoteToFeedItems<T extends PollFeedItemLike>(items: T[], pollId: string, optionId: string): T[] {
  return items.map(item =>
    item.kind === 'poll' && item.poll?.id === pollId
      ? { ...item, poll: { ...item.poll, myVoteOptionId: optionId } }
      : item,
  );
}

export function reconcilePollInFeedItems<T extends PollFeedItemLike>(items: T[], server: Poll): T[] {
  return items.map(item =>
    item.kind === 'poll' && item.poll?.id === server.id ? { ...item, poll: server } : item,
  );
}
