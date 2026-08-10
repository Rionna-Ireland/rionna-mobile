import type { HorseDetail } from '@/features/stables/types';

import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import HorseProfileScreen from '@/app/stables/[horse-id]';

const mockToggleFollow = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ 'horse-id': 'horse-1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, Image: 'Image' };
});

jest.mock('@/components/ui/screen-layout', () => ({
  useScreenTopPadding: () => 0,
}));

jest.mock('@/features/stables/api/use-horse-follow', () => ({
  useFollowHorse: () => ({ toggleFollow: mockToggleFollow, pendingHorseId: null }),
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    playing: false,
    addListener: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    remove: jest.fn(),
  })),
}));

function baseHorse(overrides: Partial<HorseDetail> = {}): HorseDetail {
  return {
    id: 'horse-1',
    organizationId: 'org-1',
    slug: 'laska',
    name: 'Laska',
    status: 'IN_TRAINING',
    isFollowing: false,
    bio: null,
    story: null,
    trainerNotes: null,
    photos: [],
    audioNotes: [],
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
    entries: [],
    ...overrides,
  };
}

const mockUseHorse = jest.fn();
const mockUseHorseWellbeing = jest.fn();

jest.mock('@/features/stables/api/use-horse', () => ({
  useHorse: (...args: unknown[]) => mockUseHorse(...args),
}));

jest.mock('@/features/stables/api/use-horse-wellbeing', () => ({
  useHorseWellbeing: (...args: unknown[]) => mockUseHorseWellbeing(...args),
}));

describe('horseProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHorseWellbeing.mockReturnValue({ data: [] });
  });

  it('renders story, wellbeing, and audio note sections when present', () => {
    mockUseHorse.mockReturnValue({
      data: baseHorse({
        story: 'A long and storied career on the flat.',
        pedigree: { sire: 'Galileo' },
        audioNotes: [{ url: 'https://cdn.test/note.mp3', caption: 'Trainer update' }],
      }),
      isLoading: false,
      isError: false,
    });
    mockUseHorseWellbeing.mockReturnValue({
      data: [
        {
          id: 'wb-1',
          horseId: 'horse-1',
          organizationId: 'org-1',
          type: 'VET',
          body: 'All clear at the vet check.',
          publishedAt: '2026-08-01T00:00:00.000Z',
          notifyMembers: false,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });

    render(<HorseProfileScreen />);

    expect(screen.getByText('Story & Pedigree')).toBeOnTheScreen();
    expect(screen.getByText('A long and storied career on the flat.')).toBeOnTheScreen();
    expect(screen.getByText('Wellbeing Timeline')).toBeOnTheScreen();
    expect(screen.getByText('All clear at the vet check.')).toBeOnTheScreen();
    expect(screen.getByText('Audio Notes')).toBeOnTheScreen();
    expect(screen.getByText('Trainer update')).toBeOnTheScreen();
  });

  it('never crashes and omits sections for a horse with no story/wellbeing/audio', () => {
    mockUseHorse.mockReturnValue({
      data: baseHorse(),
      isLoading: false,
      isError: false,
    });

    render(<HorseProfileScreen />);

    expect(screen.getByText('Laska')).toBeOnTheScreen();
    expect(screen.queryByText('Story & Pedigree')).toBeNull();
    expect(screen.queryByText('Wellbeing Timeline')).toBeNull();
    expect(screen.queryByText('Audio Notes')).toBeNull();
  });

  it('does not render horse content while the horse is loading', () => {
    mockUseHorse.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(<HorseProfileScreen />);

    expect(screen.queryByText('Laska')).toBeNull();
  });
});
