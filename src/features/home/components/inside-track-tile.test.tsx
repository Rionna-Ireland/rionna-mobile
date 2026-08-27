import type { InsideTrackResult } from '@/features/member-content/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { InsideTrackTile } from '@/features/home/components/inside-track-tile';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeResult(overrides: Partial<InsideTrackResult> = {}): InsideTrackResult {
  return {
    ok: true,
    configured: true,
    pinned: [],
    latest: [],
    ...overrides,
  };
}

describe('insideTrackTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the newest latest piece\'s title and navigates on press', () => {
    render(
      <InsideTrackTile
        data={makeResult({
          latest: [
            {
              id: 'post-1',
              spaceId: 'space-1',
              kind: 'post',
              title: 'Reading a racecard',
              excerpt: null,
              createdAt: new Date().toISOString(),
              spaceName: 'Inside Track',
              authorName: 'Trainer Jones',
              commentCount: 0,
              likeCount: 0,
              isLiked: false,
              imageUrl: null,
              url: null,
            },
          ],
        })}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Reading a racecard')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('inside-track-tile'));

    expect(mockPush).toHaveBeenCalledWith('/inside-track');
  });

  it('renders nothing when unconfigured', () => {
    render(<InsideTrackTile data={makeResult({ configured: false })} isLoading={false} />);

    expect(screen.queryByText('Inside Track')).not.toBeOnTheScreen();
  });

  it('renders nothing when configured but empty', () => {
    render(
      <InsideTrackTile
        data={makeResult({ configured: true, pinned: [], latest: [] })}
        isLoading={false}
      />,
    );

    expect(screen.queryByText('Inside Track')).not.toBeOnTheScreen();
  });

  it('renders nothing on error/offline (data undefined, done loading)', () => {
    render(<InsideTrackTile data={undefined} isLoading={false} />);

    expect(screen.queryByText('Inside Track')).not.toBeOnTheScreen();
    expect(screen.queryByText('Nothing here yet')).not.toBeOnTheScreen();
  });

  it('falls back to the pinned item when latest is empty', () => {
    render(
      <InsideTrackTile
        data={makeResult({
          latest: [],
          pinned: [
            {
              id: 'pin-1',
              spaceId: 'space-1',
              kind: 'post',
              title: 'Start Here: club basics',
              excerpt: null,
              createdAt: new Date().toISOString(),
              spaceName: 'Inside Track',
              authorName: 'Club Admin',
              commentCount: 0,
              likeCount: 0,
              isLiked: false,
              imageUrl: null,
              url: null,
            },
          ],
        })}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Start Here: club basics')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('inside-track-tile'));

    expect(mockPush).toHaveBeenCalledWith('/inside-track');
  });
});
