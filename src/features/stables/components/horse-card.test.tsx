import type { Horse } from '@/features/stables/types';

import * as React from 'react';
import { Alert } from 'react-native';

import { fireEvent, render, screen } from '@/lib/test-utils';

import { HorseCard } from './horse-card';

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
    isFollowing: false,
    inviteOnly: false,
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

describe('horseCard', () => {
  it('renders a Private chip when the horse is invite-only', () => {
    render(<HorseCard horse={makeHorse({ inviteOnly: true })} onPress={jest.fn()} />);
    expect(screen.getByText('Private')).toBeOnTheScreen();
  });

  it('does not render a Private chip for a regular horse', () => {
    render(<HorseCard horse={makeHorse({ inviteOnly: false })} onPress={jest.fn()} />);
    expect(screen.queryByText('Private')).not.toBeOnTheScreen();
  });

  it('passes confirmBeforeUnfollow to the follow toggle for an invite-only horse', () => {
    const onToggleFollow = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(
      <HorseCard
        horse={makeHorse({ inviteOnly: true, isFollowing: true, name: 'Laska' })}
        onPress={jest.fn()}
        onToggleFollow={onToggleFollow}
      />,
    );

    // Confirm dialog should intercept the press instead of toggling directly.
    fireEvent.press(screen.getByLabelText('Unfollow horse'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Leave Laska?',
      'You\'ll lose access to Laska. Only a club admin can add you back.',
      expect.any(Array),
    );
    expect(onToggleFollow).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
