import type { Horse } from '@/features/stables/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { MyHorsesTile } from '@/features/pulse/components/my-horses-tile';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, Image: 'Image' };
});

function makeHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 'horse-1',
    organizationId: 'org-1',
    slug: 'laska',
    name: 'Laska',
    status: 'IN_TRAINING',
    isFollowing: true,
    bio: null,
    trainerNotes: null,
    photos: [],
    pedigree: null,
    ownershipBlurb: null,
    circleSpaceId: null,
    trainerId: null,
    trainer: null,
    sortOrder: 0,
    publishedAt: '2026-01-01T00:00:00.000Z',
    latestEntryId: null,
    nextEntryId: null,
    providerEntityId: null,
    providerLastSync: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('myHorsesTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows an empty-state nudge toward Stables when nothing is followed', () => {
    render(<MyHorsesTile data={[]} isLoading={false} />);

    expect(screen.getByText('Follow horses in the Stables to see them here.')).toBeOnTheScreen();
  });

  it('shows the empty state when data is undefined', () => {
    render(<MyHorsesTile data={undefined} isLoading={false} />);

    expect(screen.getByText('Follow horses in the Stables to see them here.')).toBeOnTheScreen();
  });

  it('renders a tile per followed horse with name and status', () => {
    render(
      <MyHorsesTile
        data={[
          makeHorse({ id: 'horse-1', name: 'Laska', status: 'IN_TRAINING' }),
          makeHorse({ id: 'horse-2', name: 'Comet', status: 'RETIRED' }),
        ]}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Laska')).toBeOnTheScreen();
    expect(screen.getByText('IN_TRAINING')).toBeOnTheScreen();
    expect(screen.getByText('Comet')).toBeOnTheScreen();
    expect(screen.getByText('RETIRED')).toBeOnTheScreen();
  });

  it('navigates to the horse profile when a tile is pressed', () => {
    render(<MyHorsesTile data={[makeHorse({ id: 'horse-1', name: 'Laska' })]} isLoading={false} />);

    fireEvent.press(screen.getByText('Laska'));

    expect(mockPush).toHaveBeenCalledWith('/stables/horse-1');
  });
});
