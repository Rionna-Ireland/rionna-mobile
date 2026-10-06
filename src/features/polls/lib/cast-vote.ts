import type { Poll } from '@/features/polls/types';

import { haptics } from '@/lib/motion';

/**
 * A member's tap on a poll option (S14-01 haptics: vote cast → `success()`).
 * Like RSVP, the haptic confirms the member's own action as it's cast; it
 * stays silent when the tap re-picks the option they already hold, since no
 * vote changes. Returns whether the tap changed the vote (S14-06 replays the
 * charity wave only then, after this haptic; it never fires its own).
 */
export function castVote(
  poll: Pick<Poll, 'id' | 'myVoteOptionId'>,
  optionId: string,
  onVote: (pollId: string, optionId: string) => void,
): boolean {
  const changed = poll.myVoteOptionId !== optionId;
  if (changed)
    haptics.success();
  onVote(poll.id, optionId);
  return changed;
}
