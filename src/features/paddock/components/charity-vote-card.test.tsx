import type { Poll } from '@/features/polls/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { CharityVoteCard } from '@/features/paddock/components/charity-vote-card';
import { haptics } from '@/lib/motion';

jest.mock('@/lib/motion/haptics', () => ({
  ...jest.requireActual('@/lib/motion/haptics'),
  success: jest.fn(),
}));

const POLL: Poll = {
  id: 'p1',
  question: 'Which cause next season?',
  scope: 'club',
  circleSpaceId: null,
  status: 'open',
  publishedAt: '2026-08-20T00:00:00.000Z',
  closesAt: null,
  options: [{ id: 'a', label: 'Equine welfare', sortOrder: 0 }, { id: 'b', label: 'Local hospice', sortOrder: 1 }],
  myVoteOptionId: 'a',
  results: { total: 4, byOption: { a: 3, b: 1 } },
};

const opts = { includeHiddenElements: true };

describe('charityVoteCard vote replay (S14-06 §4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('no wave until the member votes', () => {
    render(<CharityVoteCard poll={POLL} pending={false} onVote={jest.fn()} />);
    expect(screen.queryByTestId('charity-vote-wave', opts)).toBeNull();
  });

  it('a changed vote fires one success haptic and replays the wave', () => {
    const onVote = jest.fn();
    render(<CharityVoteCard poll={POLL} pending={false} onVote={onVote} />);
    fireEvent.press(screen.getByTestId('poll-option-b'));
    expect(onVote).toHaveBeenCalledWith('p1', 'b');
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('charity-vote-wave', opts)).toBeTruthy();
    expect(screen.getByTestId('poll-bar-a')).toBeOnTheScreen();
  });

  it('re-picking the held option does nothing extra', () => {
    render(<CharityVoteCard poll={POLL} pending={false} onVote={jest.fn()} />);
    fireEvent.press(screen.getByTestId('poll-option-a'));
    expect(haptics.success).not.toHaveBeenCalled();
    expect(screen.queryByTestId('charity-vote-wave', opts)).toBeNull();
  });

  it('reduce motion: the haptic only, no wave', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<CharityVoteCard poll={POLL} pending={false} onVote={jest.fn()} />);
    fireEvent.press(screen.getByTestId('poll-option-b'));
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('charity-vote-wave', opts)).toBeNull();
  });
});
