import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { InsideTrackCard, minWatchLabel } from '@/features/home/components/inside-track-card';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

function data(videoDurationSeconds?: number) {
  return {
    ok: true,
    configured: true,
    pinned: [],
    latest: [{
      id: 'p1',
      spaceId: 's1',
      kind: 'post' as const,
      title: 'How a filly is named',
      excerpt: null,
      createdAt: '2020-01-01T00:00:00.000Z',
      spaceName: null,
      authorName: null,
      commentCount: 0,
      likeCount: 0,
      isLiked: false,
      imageUrl: null,
      url: null,
      videoDurationSeconds,
    }],
  };
}

describe('minWatchLabel', () => {
  it('rounds up to whole minutes with singular and plural', () => {
    expect(minWatchLabel(61)).toBe('2 min watch');
    expect(minWatchLabel(240)).toBe('4 min watch');
    expect(minWatchLabel(30)).toBe('1 min watch');
  });

  it('is null without a positive duration', () => {
    expect(minWatchLabel(undefined)).toBeNull();
    expect(minWatchLabel(0)).toBeNull();
  });
});

describe('insideTrackCard duration tag', () => {
  it('shows the min watch tag when the item has a duration', () => {
    render(<InsideTrackCard data={data(200)} now={new Date('2026-10-07')} entranceIndex={0} />);
    expect(screen.getByText('4 min watch')).toBeOnTheScreen();
  });

  it('hides the tag without a duration', () => {
    render(<InsideTrackCard data={data()} now={new Date('2026-10-07')} entranceIndex={0} />);
    expect(screen.queryByTestId('home-inside-track-duration')).toBeNull();
  });
});
