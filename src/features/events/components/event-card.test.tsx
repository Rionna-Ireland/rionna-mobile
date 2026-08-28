import type { ClubEvent } from '@/features/events/types';

import * as React from 'react';

import { EventCard } from '@/features/events/components/event-card';
import { cleanup, render, screen, setup } from '@/lib/test-utils';

afterEach(cleanup);

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

describe('eventCard', () => {
  it('renders the title, formatted date and location', () => {
    render(<EventCard event={clubEvent()} onPress={jest.fn()} />);

    expect(screen.getByText('Autumn Race Day')).toBeOnTheScreen();
    expect(screen.getByText('The Curragh')).toBeOnTheScreen();
    expect(
      screen.getByText(
        new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date('2026-09-05T10:00:00.000Z')),
      ),
    ).toBeOnTheScreen();
  });

  it('shows a Going chip when the member has RSVPed', () => {
    render(
      <EventCard
        event={clubEvent({ rsvp: { going: true, status: 'yes', count: 4, limit: null, disabled: false, full: false } })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Going ✓')).toBeOnTheScreen();
  });

  it('shows a Full badge when the event is full and the member is not going', () => {
    render(
      <EventCard
        event={clubEvent({ rsvp: { going: false, status: null, count: 20, limit: 20, disabled: true, full: true } })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Full')).toBeOnTheScreen();
  });

  it('does not show the Full badge when the member is going to a full event', () => {
    render(
      <EventCard
        event={clubEvent({ rsvp: { going: true, status: 'yes', count: 20, limit: 20, disabled: true, full: true } })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Going ✓')).toBeOnTheScreen();
    expect(screen.queryByText('Full')).toBeNull();
  });

  it('renders the placeholder block when there is no cover image', () => {
    render(<EventCard event={clubEvent({ coverImageUrl: null })} onPress={jest.fn()} />);

    expect(screen.getByTestId('event-card-placeholder')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-card-cover')).toBeNull();
  });

  it('renders the cover image when set', () => {
    render(
      <EventCard
        event={clubEvent({ coverImageUrl: 'https://example.com/cover.jpg' })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId('event-card-cover')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-card-placeholder')).toBeNull();
  });

  it('fires onPress when tapped', async () => {
    const onPress = jest.fn();
    const { user } = setup(<EventCard event={clubEvent()} onPress={onPress} />);

    await user.press(screen.getByTestId('event-card-event-1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
