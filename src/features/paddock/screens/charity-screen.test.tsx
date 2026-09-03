import type { Charity } from '@/features/paddock/types';
import type { Poll } from '@/features/polls/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { CharityView } from '@/features/paddock/screens/charity-screen';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null, Image: 'Image' };
});

const CHARITY: Charity = {
  charityName: 'Irish Injured Jockeys',
  description: 'Supporting jockeys after injury.',
  logoUrl: null,
  websiteUrl: 'https://iij.ie',
  percentage: 5,
  totalCents: 2_450_000,
  goalCents: 3_600_000,
  goalProgress: 2_450_000 / 3_600_000,
  currency: 'EUR',
  stories: [{ id: 'n1', slug: 'six-horses', title: 'Six horses retrained', subtitle: null, featuredImageUrl: null, publishedAt: '2026-08-01T00:00:00.000Z' }],
  pollId: 'p1',
};

const POLL: Poll = {
  id: 'p1',
  question: 'Which cause next season?',
  scope: 'club',
  circleSpaceId: null,
  status: 'open',
  publishedAt: '2026-08-20T00:00:00.000Z',
  closesAt: null,
  options: [{ id: 'a', label: 'Equine welfare', sortOrder: 0 }, { id: 'b', label: 'Local hospice', sortOrder: 1 }],
  myVoteOptionId: null,
  results: null,
};

const base = {
  isLoading: false,
  isError: false,
  isRefetching: false,
  onRefresh: jest.fn(),
  onOpenStory: jest.fn(),
  onOpenWebsite: jest.fn(),
  onVote: jest.fn(),
  pendingPollId: null,
};

describe('charityView', () => {
  it('renders total, goal progress, the percentage statement and the charity', () => {
    render(<CharityView {...base} charity={CHARITY} poll={POLL} />);
    expect(screen.getByText('€24,500')).toBeOnTheScreen();
    expect(screen.getByText('68% of the €36,000 goal')).toBeOnTheScreen();
    expect(screen.getByText('5% of every membership goes to Irish Injured Jockeys')).toBeOnTheScreen();
    expect(screen.getByText('Supporting jockeys after injury.')).toBeOnTheScreen();
  });

  it('opens a story by slug and the website link', () => {
    render(<CharityView {...base} charity={CHARITY} poll={POLL} />);
    fireEvent.press(screen.getByTestId('charity-story-n1'));
    expect(base.onOpenStory).toHaveBeenCalledWith('six-horses');
    fireEvent.press(screen.getByTestId('charity-website'));
    expect(base.onOpenWebsite).toHaveBeenCalledWith('https://iij.ie');
  });

  it('renders the linked poll card and forwards votes', () => {
    render(<CharityView {...base} charity={CHARITY} poll={POLL} />);
    fireEvent.press(screen.getByTestId('poll-option-a'));
    expect(base.onVote).toHaveBeenCalledWith('p1', 'a');
  });

  it('omits the goal line and vote section when absent', () => {
    render(<CharityView {...base} charity={{ ...CHARITY, goalCents: null, goalProgress: null, pollId: null }} poll={undefined} />);
    expect(screen.queryByText(/goal/)).toBeNull();
    expect(screen.queryByText('Member vote')).toBeNull();
  });

  it('shows the not-yet state when no charity is configured', () => {
    render(<CharityView {...base} charity={null} poll={undefined} />);
    expect(screen.getByTestId('charity-empty')).toBeOnTheScreen();
  });
});
