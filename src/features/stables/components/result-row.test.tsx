import type { Entry } from '@/features/stables/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { ResultRow } from '@/features/stables/components/result-row';
import { openExternalLink } from '@/lib/open-external-link';

jest.mock('@/lib/open-external-link', () => ({
  openExternalLink: jest.fn(),
}));

const mockOpenExternalLink = openExternalLink as jest.MockedFunction<typeof openExternalLink>;

const BASE_ENTRY: Entry = {
  id: 'entry-1',
  status: 'RAN',
  draw: null,
  weightLbs: null,
  finishingPosition: 1,
  beatenLengths: null,
  ratingAchieved: null,
  timeformComment: null,
  performanceRating: null,
  starRating: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  jockey: null,
  race: {
    id: 'race-1',
    name: 'Test Handicap',
    postTime: '2026-01-01T14:00:00.000Z',
    raceType: null,
    distanceFurlongs: 8,
    className: null,
    goingDescription: null,
    meeting: {
      id: 'meeting-1',
      date: '2026-01-01T00:00:00.000Z',
      course: { id: 'course-1', name: 'Leopardstown', country: 'IE' },
    },
  },
};

describe('resultRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render a replay affordance when replayUrl is absent', () => {
    render(<ResultRow entry={BASE_ENTRY} />);

    expect(screen.queryByText('Watch Replay')).toBeNull();
  });

  it('opens the replay url via the shared external-link helper when tapped', () => {
    const entry: Entry = { ...BASE_ENTRY, replayUrl: 'https://video.example/race-1' };
    render(<ResultRow entry={entry} />);

    fireEvent.press(screen.getByText('Watch Replay'));

    expect(mockOpenExternalLink).toHaveBeenCalledWith('https://video.example/race-1');
  });
});
