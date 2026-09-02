import type { ActivePollsResult, Poll } from '@/features/polls/types';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { ClubVoteTile } from '@/features/home/components/club-vote-tile';

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

describe('clubVoteTile', () => {
  it('renders nothing when there is no open club poll', () => {
    const data: ActivePollsResult = { ok: true, polls: [poll({ status: 'closed', results: { total: 0, byOption: {} } })] };
    const { toJSON } = render(<ClubVoteTile data={data} isLoading={false} onVote={jest.fn()} pendingPollId={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the newest open club poll and forwards votes', () => {
    const onVote = jest.fn();
    const data: ActivePollsResult = {
      ok: true,
      polls: [poll({ id: 'p2', publishedAt: '2026-09-02T09:00:00.000Z' }), poll()],
    };
    render(<ClubVoteTile data={data} isLoading={false} onVote={onVote} pendingPollId={null} />);
    // "Club vote" appears both as the TileWrapper heading and as the PollCard
    // eyebrow for a club-scope open poll — assert both are present.
    expect(screen.getAllByText('Club vote').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('poll-card-p2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('poll-option-o1'));
    expect(onVote).toHaveBeenCalledWith('p2', 'o1');
  });
});
