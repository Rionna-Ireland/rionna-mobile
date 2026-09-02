import type { Poll } from '@/features/polls/types';

import { PollCard } from '@/features/polls/components/poll-card';

import { cleanup, render, screen, setup } from '@/lib/test-utils';

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'p1',
    question: 'Which charity should we support next?',
    scope: 'club',
    circleSpaceId: null,
    status: 'open',
    publishedAt: '2026-09-01T09:00:00.000Z',
    closesAt: null,
    options: [{ id: 'o1', label: 'Irish Injured Jockeys', sortOrder: 0 }, { id: 'o2', label: 'Pieta', sortOrder: 1 }],
    myVoteOptionId: null,
    results: null,
    ...overrides,
  };
}

afterEach(cleanup);

describe('pollCard', () => {
  it('renders the question and tappable options before voting', async () => {
    const onVote = jest.fn();
    const { user } = setup(<PollCard poll={poll()} onVote={onVote} pending={false} variant="card" />);
    expect(screen.getByText('Which charity should we support next?')).toBeOnTheScreen();
    await user.press(screen.getByTestId('poll-option-o2'));
    expect(onVote).toHaveBeenCalledWith('p1', 'o2');
  });

  it('shows result bars with the member’s choice marked once results exist', () => {
    render(
      <PollCard
        poll={poll({ myVoteOptionId: 'o1', results: { total: 4, byOption: { o1: 3, o2: 1 } } })}
        onVote={jest.fn()}
        pending={false}
        variant="card"
      />,
    );
    expect(screen.getByText('75%')).toBeOnTheScreen();
    expect(screen.getByText('25%')).toBeOnTheScreen();
    expect(screen.getByText('4 votes')).toBeOnTheScreen();
    expect(screen.getByTestId('poll-my-choice-o1')).toBeOnTheScreen();
  });

  it('lets a member change their vote while open by tapping another result row', async () => {
    const onVote = jest.fn();
    const { user } = setup(
      <PollCard
        poll={poll({ myVoteOptionId: 'o1', results: { total: 1, byOption: { o1: 1, o2: 0 } } })}
        onVote={onVote}
        pending={false}
        variant="card"
      />,
    );
    await user.press(screen.getByTestId('poll-option-o2'));
    expect(onVote).toHaveBeenCalledWith('p1', 'o2');
  });

  it('disables voting and shows "Closed" on a closed poll', async () => {
    const onVote = jest.fn();
    const { user } = setup(
      <PollCard
        poll={poll({ status: 'closed', results: { total: 0, byOption: { o1: 0, o2: 0 } } })}
        onVote={onVote}
        pending={false}
        variant="card"
      />,
    );
    expect(screen.getByText('Closed')).toBeOnTheScreen();
    await user.press(screen.getByTestId('poll-option-o1'));
    expect(onVote).not.toHaveBeenCalled();
  });

  it('shows the pending state while a vote is in flight', () => {
    render(<PollCard poll={poll({ myVoteOptionId: 'o1' })} onVote={jest.fn()} pending variant="card" />);
    expect(screen.getByText('Saving your vote…')).toBeOnTheScreen();
  });

  it('marks the chosen option as selected for accessibility, pre-vote pill branch', () => {
    render(<PollCard poll={poll({ myVoteOptionId: 'o1' })} onVote={jest.fn()} pending={false} variant="card" />);
    expect(screen.getByTestId('poll-option-o1')).toBeSelected();
    expect(screen.getByTestId('poll-option-o2')).not.toBeSelected();
    expect(screen.getByTestId('poll-option-o1').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(screen.getByTestId('poll-option-o2').props.accessibilityState).toEqual({ selected: false, disabled: false });
  });

  it('marks the chosen option as selected for accessibility, results-row branch', () => {
    render(
      <PollCard
        poll={poll({ myVoteOptionId: 'o1', results: { total: 4, byOption: { o1: 3, o2: 1 } } })}
        onVote={jest.fn()}
        pending={false}
        variant="card"
      />,
    );
    expect(screen.getByTestId('poll-option-o1')).toBeSelected();
    expect(screen.getByTestId('poll-option-o2')).not.toBeSelected();
    expect(screen.getByTestId('poll-option-o1').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(screen.getByTestId('poll-option-o2').props.accessibilityState).toEqual({ selected: false, disabled: false });
    expect(screen.queryByTestId('poll-my-choice-o2')).not.toBeOnTheScreen();
  });

  it('does not show the "Club vote" eyebrow in tile variant for an open club poll', () => {
    render(<PollCard poll={poll()} onVote={jest.fn()} pending={false} variant="tile" />);
    expect(screen.queryByText('Club vote')).not.toBeOnTheScreen();
  });

  it('still shows the "Closed" eyebrow in tile variant for a closed poll', () => {
    render(
      <PollCard
        poll={poll({ status: 'closed', results: { total: 0, byOption: { o1: 0, o2: 0 } } })}
        onVote={jest.fn()}
        pending={false}
        variant="tile"
      />,
    );
    expect(screen.getByText('Closed')).toBeOnTheScreen();
  });
});
