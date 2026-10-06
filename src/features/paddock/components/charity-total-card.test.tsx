import type { Charity } from '@/features/paddock/types';

import { render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { CharityTotalCard } from '@/features/paddock/components/charity-total-card';
import { resetCharityCounterSession } from '@/features/paddock/lib/charity-counter';
import { getItem, setItem } from '@/lib/storage';

jest.mock('@/lib/storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('@/features/auth/use-auth-store', () => ({
  useAuthStore: { use: { user: () => ({ id: 'member-1' }) } },
}));

const KEY = 'charity:last-seen:member-1:charity';

const CHARITY: Charity = {
  charityName: 'Irish Injured Jockeys',
  description: '',
  logoUrl: null,
  websiteUrl: null,
  percentage: 5,
  totalCents: 2_450_000,
  goalCents: 3_600_000,
  goalProgress: 2_450_000 / 3_600_000,
  currency: 'EUR',
  stories: [],
  pollId: null,
};

const opts = { includeHiddenElements: true };

function lastSeen(cents: number | null) {
  jest.mocked(getItem).mockReturnValue(cents);
}

describe('charityTotalCard (S14-06 counter)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });
  afterEach(resetCharityCounterSession);

  it('first-ever view: counts up from €0, records the total, arms the wave', () => {
    lastSeen(null);
    render(<CharityTotalCard charity={CHARITY} />);
    expect(screen.getByLabelText('€24,500')).toBeOnTheScreen();
    expect(screen.queryByText('€24,500')).toBeNull();
    expect(setItem).toHaveBeenCalledWith(KEY, 2_450_000);
    expect(screen.getByTestId('charity-total-wave', opts)).toBeTruthy();
  });

  it('an increase since last seen counts and waves', () => {
    lastSeen(2_400_000);
    render(<CharityTotalCard charity={CHARITY} />);
    expect(screen.getByLabelText('€24,500')).toBeOnTheScreen();
    expect(screen.getByTestId('charity-total-wave', opts)).toBeTruthy();
  });

  it('no change: static total, no wave', () => {
    lastSeen(2_450_000);
    render(<CharityTotalCard charity={CHARITY} />);
    expect(screen.getByText('€24,500')).toBeOnTheScreen();
    expect(screen.queryByTestId('charity-total-wave', opts)).toBeNull();
    expect(setItem).toHaveBeenCalledWith(KEY, 2_450_000);
  });

  it('plays once per session: a second visit is static and writes nothing', () => {
    lastSeen(null);
    const { unmount } = render(<CharityTotalCard charity={CHARITY} />);
    unmount();
    jest.mocked(setItem).mockClear();
    render(<CharityTotalCard charity={CHARITY} />);
    expect(screen.getByText('€24,500')).toBeOnTheScreen();
    expect(screen.queryByTestId('charity-total-wave', opts)).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reduce motion: final number immediately, no wave', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    lastSeen(null);
    render(<CharityTotalCard charity={CHARITY} />);
    expect(screen.getByText('€24,500')).toBeOnTheScreen();
    expect(screen.queryByTestId('charity-total-wave', opts)).toBeNull();
    expect(setItem).toHaveBeenCalledWith(KEY, 2_450_000);
  });

  it('keeps the goal bar and line', () => {
    lastSeen(null);
    render(<CharityTotalCard charity={CHARITY} />);
    expect(screen.getByTestId('charity-goal-bar')).toBeOnTheScreen();
    expect(screen.getByText('68% of this year’s €36,000 goal')).toBeOnTheScreen();
  });
});
