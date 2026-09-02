import type { Poll } from '@/features/polls/types';

type PollFeedItemLike = { id: string; kind: string; poll?: Poll };

export function applyVoteToPolls(polls: Poll[], pollId: string, optionId: string): Poll[] {
  let changed = false;
  const next = polls.map((p) => {
    if (p.id !== pollId || p.myVoteOptionId === optionId)
      return p;
    changed = true;
    return { ...p, myVoteOptionId: optionId };
  });
  return changed ? next : polls;
}

export function reconcilePollInPolls(polls: Poll[], server: Poll): Poll[] {
  let changed = false;
  const next = polls.map((p) => {
    if (p.id !== server.id || p === server)
      return p;
    changed = true;
    return server;
  });
  return changed ? next : polls;
}

export function applyVoteToFeedItems<T extends PollFeedItemLike>(items: T[], pollId: string, optionId: string): T[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.kind !== 'poll' || item.poll?.id !== pollId || item.poll.myVoteOptionId === optionId)
      return item;
    changed = true;
    return { ...item, poll: { ...item.poll, myVoteOptionId: optionId } };
  });
  return changed ? next : items;
}

export function reconcilePollInFeedItems<T extends PollFeedItemLike>(items: T[], server: Poll): T[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.kind !== 'poll' || item.poll?.id !== server.id || item.poll === server)
      return item;
    changed = true;
    return { ...item, poll: server };
  });
  return changed ? next : items;
}
