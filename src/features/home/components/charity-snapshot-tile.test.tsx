import type { CharityResult } from '@/features/paddock/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { CharitySnapshotTile } from '@/features/home/components/charity-snapshot-tile';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const DATA: CharityResult = {
  ok: true,
  charity: {
    charityName: 'Irish Injured Jockeys',
    description: 'd',
    logoUrl: null,
    websiteUrl: null,
    percentage: 5,
    totalCents: 2_450_000,
    goalCents: null,
    goalProgress: null,
    currency: 'EUR',
    stories: [],
    pollId: null,
  },
};

describe('charitySnapshotTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the total and charity and navigates on press', () => {
    render(<CharitySnapshotTile data={DATA} isLoading={false} />);
    expect(screen.getByText('€24,500')).toBeOnTheScreen();
    expect(screen.getByText(/Irish Injured Jockeys/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('charity-snapshot-tile'));
    expect(mockPush).toHaveBeenCalledWith('/paddock/charity');
  });
  it('renders nothing when no charity is configured', () => {
    render(<CharitySnapshotTile data={{ ok: true, charity: null }} isLoading={false} />);
    expect(screen.queryByText('Charity')).not.toBeOnTheScreen();
  });
  it('renders nothing on error/offline (data undefined, done loading)', () => {
    render(<CharitySnapshotTile data={undefined} isLoading={false} />);
    expect(screen.queryByText('Charity')).not.toBeOnTheScreen();
  });
});
