import type { MonthRef } from '@/features/events/lib/calendar-grid';

import * as React from 'react';
import { View } from 'react-native';

import { Card, Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui';
import { buildMonthGrid } from '@/features/events/lib/calendar-grid';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/** Mirrors `MonthCalendar`: 44pt header row, weekday letters, one 48pt row per week of `month`. */
export function MonthCalendarSkeleton({ month }: { month: MonthRef }) {
  const weeks = buildMonthGrid(month).length;
  return (
    <Card>
      <View className="mb-3 h-11 flex-row items-center justify-center">
        <SkeletonText variant="body-sm" width={96} />
      </View>
      <View className="mb-2 flex-row">
        {WEEKDAYS.map(d => (
          <View key={d} className="flex-1 items-center">
            <SkeletonText variant="label-sm" width={10} />
          </View>
        ))}
      </View>
      {Array.from({ length: weeks }, (_, w) => (
        <View key={w} className="flex-row">
          {WEEKDAYS.map(d => (
            <View key={d} className="flex-1 items-center py-1">
              <Skeleton width={40} height={40} radius={8} />
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}

/** Mirrors `EventCard`: 36pt pattern strip, meta line, two-line title, RSVP / Remind buttons. */
export function EventCardSkeleton() {
  return (
    <Card noPadding className="flex-row">
      <Skeleton width={36} radius={0} style={{ alignSelf: 'stretch' }} />
      <View className="flex-1 gap-2 p-4">
        <SkeletonText variant="body-sm" width={140} />
        <SkeletonText variant="display-sm" lines={2} />
        <View className="mt-3 flex-row gap-2">
          <Skeleton width={72} height={30} radius={6} />
          <Skeleton width={104} height={30} radius={6} />
        </View>
      </View>
    </Card>
  );
}

/** Events first load: the calendar and two event cards, spaced like the body (16pt). */
export function EventsSkeleton({ month }: { month: MonthRef }) {
  return (
    <SkeletonGroup testID="events-loading" className="gap-4">
      <MonthCalendarSkeleton month={month} />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </SkeletonGroup>
  );
}
