import type { ClubEvent } from '@/features/events/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { EventDetailScreen, EventDetailView } from '@/features/events/screens/event-detail-screen';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, Image: 'Image' };
});

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

const mockAddEventToDeviceCalendar = jest.fn();

jest.mock('@/features/events/lib/add-to-calendar', () => ({
  addEventToDeviceCalendar: (...args: unknown[]) => mockAddEventToDeviceCalendar(...args),
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
    bodyText: 'Join us for a day at the races.',
    tiptapDoc: null,
    embeds: {},
    inlineAttachments: [],
    url: null,
    rsvp: {
      going: false,
      status: null,
      count: 12,
      limit: null,
      disabled: false,
      full: false,
    },
    ...overrides,
  };
}

describe('eventDetailView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the title, date, location and body', () => {
    render(<EventDetailView event={clubEvent()} />);

    expect(screen.getByText('Autumn Race Day')).toBeOnTheScreen();
    expect(screen.getByText('The Curragh')).toBeOnTheScreen();
    expect(screen.getByText('Join us for a day at the races.')).toBeOnTheScreen();
    expect(screen.getByText(/Sat.*Sep.*5/)).toBeOnTheScreen();
  });

  it('renders hydrated TipTap content natively when available', () => {
    render(
      <EventDetailView
        event={clubEvent({
          bodyText: 'Plain text fallback',
          tiptapDoc: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Native race day content' }] }],
          },
        })}
      />,
    );

    expect(screen.getByText('Native race day content')).toBeOnTheScreen();
    expect(screen.queryByText('Plain text fallback')).not.toBeOnTheScreen();
  });

  it('renders a tappable "Join online" link for virtual events instead of a plain location', () => {
    render(
      <EventDetailView
        event={clubEvent({
          locationType: 'virtual',
          inPersonLocation: null,
          virtualLocationUrl: 'https://example.com/live',
        })}
      />,
    );

    expect(screen.getByText('Join online')).toBeOnTheScreen();
    expect(screen.queryByText('Online')).not.toBeOnTheScreen();
  });

  it('shows the fallback message when the event cannot be found', () => {
    render(<EventDetailView event={undefined} />);
    expect(screen.getByText('This event is no longer available.')).toBeOnTheScreen();
  });

  it('shows a loading state while the event is not yet resolved', () => {
    render(<EventDetailView event={undefined} isLoading />);
    expect(screen.getByTestId('event-detail-loading')).toBeOnTheScreen();
    expect(screen.queryByText('This event is no longer available.')).toBeNull();
  });

  it('shows a connection-problem message (not the unavailable message) when the backing queries errored', () => {
    render(<EventDetailView event={undefined} isError />);
    expect(screen.getByTestId('event-detail-error')).toBeOnTheScreen();
    expect(
      screen.getByText('Couldn\'t load this event — check your connection and try again.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('This event is no longer available.')).toBeNull();
  });

  it('shows the unavailable message (not the connection-problem message) when the queries settled without error', () => {
    render(<EventDetailView event={undefined} isError={false} />);
    expect(screen.getByTestId('event-detail-unavailable')).toBeOnTheScreen();
    expect(screen.getByText('This event is no longer available.')).toBeOnTheScreen();
    expect(
      screen.queryByText('Couldn\'t load this event — check your connection and try again.'),
    ).toBeNull();
  });
});

describe('eventDetailView rsvp count', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the "N going" count with no limit', () => {
    render(<EventDetailView event={clubEvent({ rsvp: { going: false, status: null, count: 12, limit: null, disabled: false, full: false } })} />);
    expect(screen.getByText('12 going')).toBeOnTheScreen();
  });

  it('shows the "N of M going" count when a limit is set', () => {
    render(<EventDetailView event={clubEvent({ rsvp: { going: false, status: null, count: 12, limit: 20, disabled: false, full: false } })} />);
    expect(screen.getByText('12 of 20 going')).toBeOnTheScreen();
  });
});

describe('eventDetailView rsvp button', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the default RSVP label and calls onToggleRsvp(true) when pressed', () => {
    const onToggleRsvp = jest.fn();
    render(<EventDetailView event={clubEvent()} onToggleRsvp={onToggleRsvp} />);

    expect(screen.getByText('RSVP — I\'m going')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('event-rsvp-cta'));
    expect(onToggleRsvp).toHaveBeenCalledWith(true);
  });

  it('shows the going label and calls onToggleRsvp(false) when pressed', () => {
    const onToggleRsvp = jest.fn();
    render(
      <EventDetailView
        event={clubEvent({ rsvp: { going: true, status: 'yes', count: 13, limit: null, disabled: false, full: false } })}
        onToggleRsvp={onToggleRsvp}
      />,
    );

    expect(screen.getByText('Going ✓ — tap to cancel')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('event-rsvp-cta'));
    expect(onToggleRsvp).toHaveBeenCalledWith(false);
  });

  it('shows a disabled "Event full" state when full and not going', () => {
    const onToggleRsvp = jest.fn();
    render(
      <EventDetailView
        event={clubEvent({ rsvp: { going: false, status: null, count: 20, limit: 20, disabled: false, full: true } })}
        onToggleRsvp={onToggleRsvp}
      />,
    );

    expect(screen.getByText('Event full')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('event-rsvp-cta'));
    expect(onToggleRsvp).not.toHaveBeenCalled();
  });

  it('hides the RSVP control entirely when rsvp.disabled is true', () => {
    render(
      <EventDetailView
        event={clubEvent({ rsvp: { going: false, status: null, count: 5, limit: null, disabled: true, full: false } })}
      />,
    );

    expect(screen.queryByTestId('event-rsvp-cta')).toBeNull();
    expect(screen.queryByText('RSVP — I\'m going')).toBeNull();
  });

  it('shows the full state and message when rsvpFullError is set, even if the cached event is not full', () => {
    render(<EventDetailView event={clubEvent({ rsvp: { going: false, status: null, count: 5, limit: null, disabled: false, full: false } })} rsvpFullError />);

    expect(screen.getByText('Event full')).toBeOnTheScreen();
    expect(screen.getByText('This event is full.')).toBeOnTheScreen();
  });
});

describe('eventDetailView add to calendar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the add-to-calendar button for events with a start time', () => {
    render(<EventDetailView event={clubEvent()} />);
    expect(screen.getByTestId('event-add-to-calendar')).toBeOnTheScreen();
  });

  it('hides the add-to-calendar button when the event has no start time', () => {
    render(<EventDetailView event={clubEvent({ startsAt: null })} />);
    expect(screen.queryByTestId('event-add-to-calendar')).toBeNull();
  });

  it('calls onAddToCalendar when the add-to-calendar button is pressed', () => {
    const onAddToCalendar = jest.fn();
    render(<EventDetailView event={clubEvent()} onAddToCalendar={onAddToCalendar} />);
    fireEvent.press(screen.getByTestId('event-add-to-calendar'));
    expect(onAddToCalendar).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['added', 'Added to your calendar ✓'],
    ['denied', 'Calendar permission denied'],
    ['failed', 'Couldn\'t add to calendar'],
  ] as const)('shows the "%s" outcome label', (outcome, label) => {
    render(<EventDetailView event={clubEvent()} calendarOutcome={outcome} />);
    expect(screen.getByText(label)).toBeOnTheScreen();
  });
});

const mockUseEvents = jest.fn();
const mockRsvpMutate = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));
const mockUseLocalSearchParams = jest.fn();

jest.mock('@/features/auth/use-auth-store', () => ({
  useAuthStore: {
    use: {
      user: () => mockUseAuthUser(),
    },
  },
}));
const mockUseAuthUser = jest.fn();

jest.mock('@/features/events/api/use-events', () => {
  const actual = jest.requireActual('@/features/events/api/use-events');
  return {
    ...actual,
    useEvents: (_scope: unknown, eventScope: 'upcoming' | 'past') => mockUseEvents(eventScope),
  };
});

jest.mock('@/features/events/api/use-event-rsvp', () => {
  const actual = jest.requireActual('@/features/events/api/use-event-rsvp');
  return {
    ...actual,
    useEventRsvp: () => ({ mutate: mockRsvpMutate, isPending: false }),
  };
});

describe('eventDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthUser.mockReturnValue({ id: 'member-1', email: 'jane@example.com', name: 'Jane Member' });
    mockUseLocalSearchParams.mockReturnValue({ 'event-id': 'event-1' });
    mockUseEvents.mockImplementation((eventScope: 'upcoming' | 'past') => ({
      data: {
        ok: true,
        configured: true,
        events: eventScope === 'upcoming' ? [clubEvent()] : [clubEvent({ id: 'event-2', title: 'Summer Brunch' })],
      },
      isLoading: false,
    }));
  });

  it('finds the event across the upcoming and past scopes and renders it', () => {
    mockUseLocalSearchParams.mockReturnValue({ 'event-id': 'event-2' });
    render(<EventDetailScreen />);
    expect(screen.getByText('Summer Brunch')).toBeOnTheScreen();
  });

  it('shows the fallback when the event id matches nothing in either scope', () => {
    mockUseLocalSearchParams.mockReturnValue({ 'event-id': 'unknown-event' });
    render(<EventDetailScreen />);
    expect(screen.getByText('This event is no longer available.')).toBeOnTheScreen();
  });

  it('shows a connection-problem message instead of the unavailable fallback on a cold-start offline open (both queries errored, nothing cached)', () => {
    mockUseLocalSearchParams.mockReturnValue({ 'event-id': 'event-1' });
    mockUseEvents.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      isError: true,
    }));

    render(<EventDetailScreen />);

    expect(screen.getByTestId('event-detail-error')).toBeOnTheScreen();
    expect(
      screen.getByText('Couldn\'t load this event — check your connection and try again.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('This event is no longer available.')).toBeNull();
  });

  it('calls the RSVP mutation with the event id when the RSVP button is pressed', () => {
    render(<EventDetailScreen />);
    fireEvent.press(screen.getByTestId('event-rsvp-cta'));
    expect(mockRsvpMutate).toHaveBeenCalledWith(
      { eventId: 'event-1', going: true },
      expect.anything(),
    );
  });

  it('shows the full state when the RSVP mutation rejects with reason "event_full"', async () => {
    const { RsvpError } = jest.requireActual('@/features/events/api/use-event-rsvp');
    mockRsvpMutate.mockImplementation((_vars, options) => {
      options?.onError?.(new RsvpError('event_full'));
    });

    render(<EventDetailScreen />);
    fireEvent.press(screen.getByTestId('event-rsvp-cta'));

    expect(await screen.findByText('Event full')).toBeOnTheScreen();
    expect(screen.getByText('This event is full.')).toBeOnTheScreen();
  });

  it('surfaces the add-to-calendar outcome once the native call resolves', async () => {
    mockAddEventToDeviceCalendar.mockResolvedValue('added');
    render(<EventDetailScreen />);

    fireEvent.press(screen.getByTestId('event-add-to-calendar'));

    expect(await screen.findByText('Added to your calendar ✓')).toBeOnTheScreen();
    expect(mockAddEventToDeviceCalendar).toHaveBeenCalledWith(expect.objectContaining({ id: 'event-1' }));
  });
});
