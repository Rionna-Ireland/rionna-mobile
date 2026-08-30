import type { ClubEvent } from '@/features/events/types';

import { Platform } from 'react-native';

export type AddToCalendarOutcome = 'added' | 'denied' | 'failed';

/**
 * Write the event into the device calendar. Never throws -- the button
 * surfaces the outcome as a toast/label.
 *
 * expo-calendar is loaded lazily: it is a native module, and a top-level
 * import crashes the whole route at load time on clients built before the
 * module was added (house rule #1 -- never touch native modules at module
 * top-level). On such clients this degrades to 'failed' instead.
 */
function isNativeCalendarAvailable(): boolean {
  // Jest-expo stubs `globalThis.expo.modules` without ExpoCalendar. Skip unless a
  // test explicitly simulates a stale binary via `__EXPO_CALENDAR_MISSING__`.
  if (process.env.JEST_WORKER_ID) {
    return (globalThis as { __EXPO_CALENDAR_MISSING__?: boolean }).__EXPO_CALENDAR_MISSING__ !== true;
  }
  const expo = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo;
  if (!expo?.modules)
    return true;
  return expo.modules.ExpoCalendar != null;
}

export async function addEventToDeviceCalendar(
  event: ClubEvent,
): Promise<AddToCalendarOutcome> {
  try {
    // Probe the JSI host before require(). expo-calendar's entry calls
    // requireNativeModule('ExpoCalendar'), which LogBox-errors even inside try/catch
    // when the binary was built before the native module was added.
    if (!isNativeCalendarAvailable())
      return 'failed';
    // CJS-safe lazy-load (native import() is untransformed under Jest).
    const Calendar = require('expo-calendar') as typeof import('expo-calendar');
    if (typeof Calendar.requestCalendarPermissionsAsync !== 'function')
      return 'failed';
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted')
      return 'denied';
    if (!event.startsAt)
      return 'failed';
    const startDate = new Date(event.startsAt);
    if (Number.isNaN(startDate.getTime()))
      return 'failed';
    const endDate = event.endsAt && !Number.isNaN(new Date(event.endsAt).getTime())
      ? new Date(event.endsAt)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    let calendarId: string | null = null;
    if (Platform.OS === 'ios') {
      calendarId = (await Calendar.getDefaultCalendarAsync()).id;
    }
    else {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      calendarId
        = (calendars.find(c => c.allowsModifications && c.isPrimary)
          ?? calendars.find(c => c.allowsModifications))?.id ?? null;
    }
    if (!calendarId)
      return 'failed';

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      location: event.inPersonLocation ?? event.virtualLocationUrl ?? undefined,
    });
    return 'added';
  }
  catch {
    return 'failed';
  }
}
