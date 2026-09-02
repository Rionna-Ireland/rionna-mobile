import type { ActivePollsResult } from '@/features/polls/types';

import { PollCard } from '@/features/polls/components/poll-card';
import { TileWrapper } from '@/features/pulse/components/tile-wrapper';

type ClubVoteTileProps = {
  data: ActivePollsResult | undefined;
  isLoading: boolean;
  onVote: (pollId: string, optionId: string) => void;
  pendingPollId: string | null;
};

export function ClubVoteTile({ data, isLoading, onVote, pendingPollId }: ClubVoteTileProps) {
  // Newest open club-scope poll; the API already sorts by publishedAt desc.
  const current = data?.polls.find(p => p.status === 'open' && p.scope === 'club');

  // Unconfigured, empty, and error/offline all render nothing (S11-01 rule).
  if (!isLoading && !current)
    return null;

  return (
    <TileWrapper title="Club vote" isLoading={isLoading}>
      {current
        ? <PollCard poll={current} onVote={onVote} pending={pendingPollId === current.id} variant="tile" />
        : null}
    </TileWrapper>
  );
}
