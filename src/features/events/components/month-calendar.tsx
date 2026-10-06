import type { CalendarCell, MonthRef } from '@/features/events/lib/calendar-grid';

import type { PageDirection } from '@/lib/motion';
import * as React from 'react';
import { View } from 'react-native';

import Animated from 'react-native-reanimated';
import { Card, MotionPressable, Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { CaretRightV2 } from '@/components/ui/icons/v2';
import { buildMonthGrid } from '@/features/events/lib/calendar-grid';
import { translate } from '@/lib/i18n';
import { pageSlideEntering, useMotion } from '@/lib/motion';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FLIP = { transform: [{ rotate: '180deg' }] };

export type MonthCalendarProps = {
  month: MonthRef;
  /** Day key (`YYYY-MM-DD`) -> fill colour for days with events. */
  eventDays: ReadonlyMap<string, string>;
  /** Day key -> number of events, for the VoiceOver label ("2 events"). */
  eventCounts?: ReadonlyMap<string, number>;
  /** Injectable for tests/stories; defaults to now. */
  today?: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (dayKey: string) => void;
  testID?: string;
};

function monthTitle(ref: MonthRef) {
  return new Intl.DateTimeFormat('en-IE', { month: 'long', year: 'numeric' })
    .format(new Date(ref.year, ref.month, 1));
}

/** Which way the month last moved: +1 forward, -1 back, null before any change. */
function useMonthDirection(month: MonthRef): PageDirection | null {
  const index = month.year * 12 + month.month;
  const [shown, setShown] = React.useState(index);
  const [direction, setDirection] = React.useState<PageDirection | null>(null);
  // Derived from the previous render's month, so day taps into another month count too.
  if (shown !== index) {
    setShown(index);
    setDirection(index > shown ? 1 : -1);
  }
  return direction;
}

const WEEKDAY_NAME = new Intl.DateTimeFormat('en-IE', { weekday: 'long' });
const MONTH_NAME = new Intl.DateTimeFormat('en-IE', { month: 'long' });

/** "Saturday 18 October, today, 2 events" rather than the ISO key (A-022). */
function dayA11yLabel(cell: CalendarCell, hasEvents: boolean, count: number | undefined) {
  const [y, m, d] = cell.key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const parts = [`${WEEKDAY_NAME.format(date)} ${d} ${MONTH_NAME.format(date)}`];
  if (cell.isToday)
    parts.push(translate('events.calendar.today'));
  if (count && count > 1)
    parts.push(translate('events.calendar.manyEvents', { count }));
  else if (hasEvents)
    parts.push(translate('events.calendar.oneEvent'));
  return parts.join(', ');
}

type DayCellProps = {
  cell: CalendarCell;
  fill: string | undefined;
  count: number | undefined;
  onSelectDay: (dayKey: string) => void;
  testID: string;
};

/** One day square: pulses (pressScaleSmall → 1, snappy) with a selection tick on tap (S14-02 §10). */
function DayCell({ cell, fill, count, onSelectDay, testID }: DayCellProps) {
  return (
    <View className="flex-1 items-center py-1">
      <MotionPressable
        testID={`${testID}-day-${cell.key}`}
        accessibilityRole="button"
        accessibilityLabel={dayA11yLabel(cell, Boolean(fill), count)}
        size="small"
        haptic="selection"
        onPress={() => onSelectDay(cell.key)}
        className={`size-10 items-center justify-center overflow-hidden rounded-lg ${cell.isToday ? 'border border-primary' : ''}`}
        style={fill ? { backgroundColor: fill } : undefined}
      >
        <Text variant="body" className={cell.inMonth ? 'text-ink' : 'text-ink opacity-40'}>
          {cell.day}
        </Text>
      </MotionPressable>
    </View>
  );
}

type MonthGridProps = {
  month: MonthRef;
  weeks: CalendarCell[][];
  eventDays: ReadonlyMap<string, string>;
  eventCounts?: ReadonlyMap<string, number>;
  onSelectDay: (dayKey: string) => void;
  testID: string;
};

/**
 * The day grid, re-keyed per month so each new month slides in from the side
 * it came from (`gentle`); Reduce Motion crossfades it on `quick`.
 */
function MonthGrid({ month, weeks, eventDays, eventCounts, onSelectDay, testID }: MonthGridProps) {
  const { reduceMotion } = useMotion();
  const direction = useMonthDirection(month);
  return (
    <View className="overflow-hidden">
      <Animated.View
        key={`${month.year}-${month.month}`}
        testID={`${testID}-grid`}
        entering={direction ? pageSlideEntering(direction, reduceMotion) : undefined}
      >
        {weeks.map(week => (
          <View key={week[0].key} className="flex-row">
            {week.map(cell => (
              <DayCell key={cell.key} cell={cell} fill={eventDays.get(cell.key)} count={eventCounts?.get(cell.key)} onSelectDay={onSelectDay} testID={testID} />
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Pure month grid (no calendar library): Monday start, out-of-month days
 * muted @40%, today = 1pt navy outlined r8 square, event days = r8 filled
 * square. Layout/marking logic lives in lib/calendar-grid.ts.
 */
export function MonthCalendar({
  month,
  eventDays,
  eventCounts,
  today,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  testID = 'month-calendar',
}: MonthCalendarProps) {
  const weeks = React.useMemo(() => buildMonthGrid(month, today), [month, today]);

  return (
    <Card testID={testID}>
      <View className="mb-3 flex-row items-center justify-between">
        <MotionPressable
          size="small"
          testID={`${testID}-prev`}
          accessibilityRole="button"
          accessibilityLabel={translate('events.prevMonth')}
          onPress={onPrevMonth}
          className="size-11 items-center justify-center overflow-hidden rounded-full"
        >
          <CaretRightV2 size={20} color={colors.ink} style={FLIP} />
        </MotionPressable>
        <Text variant="body-sm" className="text-ink-variant" testID={`${testID}-title`}>
          {monthTitle(month)}
        </Text>
        <MotionPressable
          size="small"
          testID={`${testID}-next`}
          accessibilityRole="button"
          accessibilityLabel={translate('events.nextMonth')}
          onPress={onNextMonth}
          className="size-11 items-center justify-center overflow-hidden rounded-full"
        >
          <CaretRightV2 size={20} color={colors.ink} />
        </MotionPressable>
      </View>

      <View className="mb-2 flex-row">
        {WEEKDAYS.map((label, i) => (
          // eslint-disable-next-line react/no-array-index-key -- fixed 7 columns, letters repeat
          <View key={i} className="flex-1 items-center">
            <Text variant="label-sm" accessibilityElementsHidden importantForAccessibility="no">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <MonthGrid month={month} weeks={weeks} eventDays={eventDays} eventCounts={eventCounts} onSelectDay={onSelectDay} testID={testID} />
    </Card>
  );
}
