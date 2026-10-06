import type { Poll } from '@/features/polls/types';

import { haptics } from '@/lib/motion';

/**
 * A member's tap on a poll option (S14-01 haptics: vote cast → `success()`).
 * Like RSVP, the haptic confirms the member's own action as it's cast; it
 * stays silent when the tap re-picks the option they already hold, since no
 * vote changes.
 */
export function castVote(
  poll: Pick<Poll, 'id' | 'myVoteOptionId'>,
  optionId: string,
  onVote: (pollId: string, optionId: string) => void,
) {
  if (poll.myVoteOptionId !== optionId)
    haptics.success();
  onVote(poll.id, optionId);
}
