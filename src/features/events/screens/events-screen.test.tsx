import type { ClubEvent } from '@/features/events/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { EventsScreen } from '@/features/events/screens/events-screen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null, Image: 'Image' };
});

jest.mock('@/components/ui/screen-layout', () => ({
  useScreenTopPadding: () => 70,
}));

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

jest.mock('@/features/auth/use-auth-store', () => ({
  useAuthStore: {
    use: {
      user: () => ({ id: 'member-1', email: 'jane@example.com', name: 'Jane Member' }),
    },
  },
}));

function clubEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: 'event-1',
    spaceId: 'space-1',
    title: 'Autumn Race Day',
    startsAt: '2026-09-05T10:00:00.000Z',
    endsAt: '2026-09-05T12:00:00.000Z',
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

const upcomingQuery = {
  data: { ok: true, configured: true, events: [clubEvent()] },
  isLoading: false,
  isError: false,
};

const pastQuery = {
  data: {
    ok: true,
    configured: true,
    events: [clubEvent({ id: 'event-2', title: 'Summer Brunch' })],
  },
  isLoading: false,
  isError: false,
};

const emptyQuery = { data: { ok: true, configured: true, events: [] }, isLoading: false, isError: false };
const unavailableQuery = { data: undefined, isLoading: false, isError: true };
const loadingQuery = { data: undefined, isLoading: true, isError: false };

let mockUseEvents = jest.fn();

jest.mock('@/features/events/api/use-events', () => ({
  useEvents: (scope: unknown, eventScope: string) => mockUseEvents(scope, eventScope),
}));

describe('eventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvents = jest.fn((_scope: unknown, eventScope: string) =>
      eventScope === 'upcoming' ? upcomingQuery : pastQuery,
    );
  });

  it('renders the eyebrow and title', () => {
    render(<EventsScreen />);
    expect(screen.getByText('Race days & socials')).toBeOnTheScreen();
    expect(screen.getByText('Events')).toBeOnTheScreen();
  });

  it('shows upcoming events by default', () => {
    render(<EventsScreen />);
    expect(screen.getByText('Autumn Race Day')).toBeOnTheScreen();
    expect(screen.queryByText('Summer Brunch')).toBeNull();
  });

  it('switches to past events when the segment is pressed', () => {
    render(<EventsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Past' }));

    expect(screen.getByText('Summer Brunch')).toBeOnTheScreen();
    expect(screen.queryByText('Autumn Race Day')).toBeNull();
  });

  it('shows the upcoming empty state', () => {
    mockUseEvents = jest.fn(() => emptyQuery);
    render(<EventsScreen />);

    expect(screen.getByText('No upcoming events — check back soon.')).toBeOnTheScreen();
  });

  it('shows the past empty state', () => {
    mockUseEvents = jest.fn(() => emptyQuery);
    render(<EventsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Past' }));

    expect(screen.getByText('No past events yet.')).toBeOnTheScreen();
  });

  it('shows an unavailable state when the query errors with no snapshot', () => {
    mockUseEvents = jest.fn(() => unavailableQuery);
    render(<EventsScreen />);

    expect(screen.getByTestId('events-unavailable')).toBeOnTheScreen();
  });

  it('shows a loading state on a genuine first fetch instead of the empty copy', () => {
    mockUseEvents = jest.fn(() => loadingQuery);
    render(<EventsScreen />);

    expect(screen.getByTestId('events-loading')).toBeOnTheScreen();
    expect(screen.queryByText('No upcoming events — check back soon.')).toBeNull();
    expect(screen.queryByTestId('events-empty')).toBeNull();
  });

  it('marks the active segment as selected via accessibilityState', () => {
    render(<EventsScreen />);

    expect(screen.getByRole('button', { name: 'Upcoming' })).toHaveProp('accessibilityState', { selected: true });
    expect(screen.getByRole('button', { name: 'Past' })).toHaveProp('accessibilityState', { selected: false });

    fireEvent.press(screen.getByRole('button', { name: 'Past' }));

    expect(screen.getByRole('button', { name: 'Past' })).toHaveProp('accessibilityState', { selected: true });
    expect(screen.getByRole('button', { name: 'Upcoming' })).toHaveProp('accessibilityState', { selected: false });
  });

  it('navigates to the event detail route when a card is pressed', () => {
    render(<EventsScreen />);
    fireEvent.press(screen.getByTestId('event-card-event-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/event/[event-id]',
      params: { 'event-id': 'event-1' },
    });
  });
});
