import type { ClubEvent } from '@/features/events/types';

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import { addEventToDeviceCalendar } from '@/features/events/lib/add-to-calendar';

jest.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  requestCalendarPermissionsAsync: jest.fn(),
  getDefaultCalendarAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createEventAsync: jest.fn(),
}));

const mockRequestPermissions = Calendar.requestCalendarPermissionsAsync as jest.MockedFunction<
  typeof Calendar.requestCalendarPermissionsAsync
>;
const mockGetDefaultCalendar = Calendar.getDefaultCalendarAsync as jest.MockedFunction<
  typeof Calendar.getDefaultCalendarAsync
>;
const mockGetCalendars = Calendar.getCalendarsAsync as jest.MockedFunction<
  typeof Calendar.getCalendarsAsync
>;
const mockCreateEvent = Calendar.createEventAsync as jest.MockedFunction<
  typeof Calendar.createEventAsync
>;

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

describe('addEventToDeviceCalendar', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  afterAll(() => {
    Platform.OS = originalPlatformOS;
  });

  it('returns "denied" when calendar permission is refused', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' } as any);

    const outcome = await addEventToDeviceCalendar(clubEvent());

    expect(outcome).toBe('denied');
    expect(mockGetDefaultCalendar).not.toHaveBeenCalled();
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('creates the event on the iOS default calendar and returns "added"', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' } as any);
    mockGetDefaultCalendar.mockResolvedValue({ id: 'default-calendar-id' } as any);
    mockCreateEvent.mockResolvedValue('new-event-id');

    const outcome = await addEventToDeviceCalendar(clubEvent());

    expect(outcome).toBe('added');
    expect(mockGetDefaultCalendar).toHaveBeenCalled();
    expect(mockGetCalendars).not.toHaveBeenCalled();
    expect(mockCreateEvent).toHaveBeenCalledWith('default-calendar-id', {
      title: 'Autumn Race Day',
      startDate: new Date('2026-09-05T10:00:00.000Z'),
      endDate: new Date('2026-09-05T12:00:00.000Z'),
      location: 'The Curragh',
    });
  });

  it('picks a modifiable primary calendar on Android', async () => {
    Platform.OS = 'android';
    mockRequestPermissions.mockResolvedValue({ status: 'granted' } as any);
    mockGetCalendars.mockResolvedValue([
      { id: 'secondary', allowsModifications: true, isPrimary: false },
      { id: 'primary', allowsModifications: true, isPrimary: true },
    ] as any);
    mockCreateEvent.mockResolvedValue('new-event-id');

    const outcome = await addEventToDeviceCalendar(clubEvent());

    expect(outcome).toBe('added');
    expect(mockGetCalendars).toHaveBeenCalledWith('event');
    expect(mockCreateEvent).toHaveBeenCalledWith('primary', expect.anything());
  });

  it('returns "failed" when the event has no start date', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' } as any);

    const outcome = await addEventToDeviceCalendar(clubEvent({ startsAt: null }));

    expect(outcome).toBe('failed');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('defaults the end time to one hour after the start when endsAt is missing', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' } as any);
    mockGetDefaultCalendar.mockResolvedValue({ id: 'default-calendar-id' } as any);
    mockCreateEvent.mockResolvedValue('new-event-id');

    await addEventToDeviceCalendar(clubEvent({ endsAt: null }));

    expect(mockCreateEvent).toHaveBeenCalledWith('default-calendar-id', expect.objectContaining({
      startDate: new Date('2026-09-05T10:00:00.000Z'),
      endDate: new Date('2026-09-05T11:00:00.000Z'),
    }));
  });

  it('returns "failed" when the calendar API throws', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' } as any);
    mockGetDefaultCalendar.mockRejectedValue(new Error('native module unavailable'));

    const outcome = await addEventToDeviceCalendar(clubEvent());

    expect(outcome).toBe('failed');
  });
});
