import type { ClubEvent, EventsResult } from '@/features/events/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { NextEventTile } from '@/features/home/components/next-event-tile';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function clubEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: 'event-1',
    spaceId: 'space-1',
    title: 'Race Day',
    startsAt: '2026-09-01T10:00:00.000Z',
    endsAt: '2026-09-01T12:00:00.000Z',
    locationType: 'in_person',
    inPersonLocation: 'The Curragh',
    virtualLocationUrl: null,
    coverImageUrl: null,
    bodyText: null,
    tiptapDoc: null,
    embeds: {},
    inlineAttachments: [],
    url: null,
    rsvp: {
      going: false,
      status: null,
      count: 3,
      limit: null,
      disabled: false,
      full: false,
    },
    ...overrides,
  };
}

function makeResult(overrides: Partial<EventsResult> = {}): EventsResult {
  return {
    ok: true,
    configured: true,
    events: [],
    ...overrides,
  };
}

describe('nextEventTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the next event\'s title and date, and navigates on press', () => {
    render(
      <NextEventTile
        data={makeResult({ events: [clubEvent()] })}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Race Day')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('next-event-tile'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/event/[event-id]',
      params: { 'event-id': 'event-1' },
    });
  });

  it('shows loading state via TileWrapper', () => {
    render(<NextEventTile data={undefined} isLoading={true} />);

    expect(screen.getByText('Next event')).toBeOnTheScreen();
  });

  it('renders nothing when loaded and empty', () => {
    render(<NextEventTile data={makeResult({ events: [] })} isLoading={false} />);

    expect(screen.queryByText('Next event')).not.toBeOnTheScreen();
  });

  it('renders nothing on error/offline (data undefined, done loading)', () => {
    render(<NextEventTile data={undefined} isLoading={false} />);

    expect(screen.queryByText('Next event')).not.toBeOnTheScreen();
  });
});
