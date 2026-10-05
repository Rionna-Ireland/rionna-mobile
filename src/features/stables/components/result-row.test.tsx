import type { Entry } from '@/features/stables/types';

import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { ResultRow } from '@/features/stables/components/result-row';

const BASE_ENTRY: Entry = {
  id: 'entry-1',
  status: 'RAN',
  draw: null,
  weightLbs: null,
  finishingPosition: 3,
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
    postTime: new Date(2026, 5, 21, 14, 0).toISOString(),
    raceType: 'Maiden',
    distanceFurlongs: 6,
    className: null,
    goingDescription: null,
    meeting: {
      id: 'meeting-1',
      date: '2026-06-21T00:00:00.000Z',
      course: { id: 'course-1', name: 'Naas', country: 'IE' },
    },
  },
};

describe('resultRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the result line and date', () => {
    render(<ResultRow entry={BASE_ENTRY} />);

    expect(screen.getByText('Naas, 6f mdn — 3rd')).toBeOnTheScreen();
    expect(screen.getByText('21 June')).toBeOnTheScreen();
  });

  it('adds field size and SP when S13-10 fields are present', () => {
    render(<ResultRow entry={{ ...BASE_ENTRY, fieldSize: 11, startingPrice: '6/1' }} />);

    expect(screen.getByText('Naas, 6f mdn — 3rd of 11')).toBeOnTheScreen();
    expect(screen.getByText('21 June · 6/1')).toBeOnTheScreen();
  });

  it('never renders a replay affordance, even when replayUrl is set (S13-16)', () => {
    const entry: Entry = { ...BASE_ENTRY, replayUrl: 'https://video.example/race-1' };
    render(<ResultRow entry={entry} />);

    expect(screen.queryByText(/replay/i)).toBeNull();
  });
});
