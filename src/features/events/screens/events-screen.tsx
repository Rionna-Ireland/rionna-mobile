import type { ScrollView } from 'react-native';
import type { MonthRef } from '@/features/events/lib/calendar-grid';
import type { ClubEvent } from '@/features/events/types';

import type { EntranceFn } from '@/lib/motion';
import Env from 'env';
import { useRouter } from 'expo-router';

import * as React from 'react';
import { StyleSheet } from 'react-native';

import {
  BrandedRefreshControl,
  ChipRow,
  EmptyState,
  ErrorState,
  FocusAwareStatusBar,
  MonoLabel,
  RefreshIndicator,
  ScreenBackground,
  Text,
  usePullToRefresh,
  View,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, CollapsingTitle, CompactHeaderBar, useScrollHeader } from '@/components/ui/scroll-header';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { showErrorMessage } from '@/components/ui/utils';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useEventRsvp } from '@/features/events/api/use-event-rsvp';
import { useEvents } from '@/features/events/api/use-events';
import { EventCard } from '@/features/events/components/event-card';
import { EventsSkeleton } from '@/features/events/components/events-skeletons';
import { MonthCalendar } from '@/features/events/components/month-calendar';
import {
  groupEventsByDay,
  monthOf,
  shiftMonth,
} from '@/features/events/lib/calendar-grid';
import { useEventReminder } from '@/features/events/lib/event-reminders';
import { eventDayColour } from '@/features/events/lib/event-type';
import { translate } from '@/lib/i18n';
import { EntranceItem, isFirstLoad, SkeletonSwap, useContentEntrance } from '@/lib/motion';

const ALL = 'all';

// Same copy as the detail screen's inline notice.
const REMINDER_NOTICE_KEY = {
  'denied': 'events.detail.reminderDenied',
  'too-late': 'events.detail.reminderTooLate',
  'failed': 'events.detail.reminderFailed',
} as const;

function byStart(a: ClubEvent, b: ClubEvent) {
  return (Date.parse(a.startsAt ?? '') || 0) - (Date.parse(b.startsAt ?? '') || 0);
}

function ConnectedEventCard({
  event,
  past,
  onOpen,
  onToggleRsvp,
  rsvpPending,
}: {
  event: ClubEvent;
  past: boolean;
  onOpen: () => void;
  onToggleRsvp: (eventId: string, going: boolean) => void;
  rsvpPending: boolean;
}) {
  const reminder = useEventReminder(event);
  return (
    <EventCard
      event={event}
      past={past}
      onPress={onOpen}
      rsvpPending={rsvpPending}
      onToggleRsvp={going => onToggleRsvp(event.id, going)}
      reminderOn={reminder.on}
      onToggleReminder={() => {
        void reminder.toggle().then((outcome) => {
          if (outcome in REMINDER_NOTICE_KEY)
            showErrorMessage(translate(REMINDER_NOTICE_KEY[outcome as keyof typeof REMINDER_NOTICE_KEY]));
        });
      }}
    />
  );
}

function useEventsModel(
  upcomingAll: ClubEvent[] | undefined,
  pastAll: ClubEvent[] | undefined,
  typeFilter: string,
) {
  // Type filter chips: one per type present. Hidden until S13-11 ships `type`.
  const typeChips = React.useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const event of [...(upcomingAll ?? []), ...(pastAll ?? [])]) {
      total += 1;
      if (event.type)
        counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    }
    if (counts.size === 0)
      return [];
    return [
      { key: ALL, label: translate('events.all'), count: total },
      ...[...counts.entries()].map(([key, count]) => ({ key, label: key, count })),
    ];
  }, [upcomingAll, pastAll]);

  const matches = React.useCallback(
    (event: ClubEvent) => typeFilter === ALL || event.type === typeFilter,
    [typeFilter],
  );
  const upcoming = React.useMemo(() => (upcomingAll ?? []).filter(matches).sort(byStart), [upcomingAll, matches]);
  const past = React.useMemo(() => (pastAll ?? []).filter(matches).sort((a, b) => byStart(b, a)), [pastAll, matches]);

  const eventDays = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const [key, list] of groupEventsByDay([...upcoming, ...past])) {
      map.set(key, eventDayColour(list[0].type));
    }
    return map;
  }, [upcoming, past]);

  return { typeChips, upcoming, past, eventDays };
}

type TrackedCardProps = React.ComponentProps<typeof ConnectedEventCard> & {
  onLayoutY: (y: number) => void;
  entering: ReturnType<EntranceFn>;
};

function TrackedCard({ onLayoutY, entering, ...props }: TrackedCardProps) {
  return (
    <EntranceItem entering={entering} onLayout={e => onLayoutY(e.nativeEvent.layout.y)}>
      <ConnectedEventCard {...props} />
    </EntranceItem>
  );
}

type EventsBodyProps = {
  isLoading: boolean;
  isUnavailable: boolean;
  retrying: boolean;
  onRetry: () => void;
  month: MonthRef;
  eventDays: ReadonlyMap<string, string>;
  onMonthChange: (delta: number) => void;
  onSelectDay: (key: string) => void;
  emptyDay: string | null;
  hasEvents: boolean;
  onListLayout: (y: number) => void;
  /** y of the body inside the scroll content (card offsets are measured inside it). */
  onBodyLayout: (y: number) => void;
  children: React.ReactNode;
};

function EventsContent({
  isUnavailable,
  retrying,
  onRetry,
  month,
  eventDays,
  onMonthChange,
  onSelectDay,
  emptyDay,
  hasEvents,
  onListLayout,
  children,
}: Omit<EventsBodyProps, 'isLoading' | 'onBodyLayout'>) {
  if (isUnavailable) {
    return (
      <ErrorState
        testID="events-unavailable"
        title={translate('events.unavailableTitle')}
        body={translate('events.unavailableBody')}
        retrying={retrying}
        onRetry={onRetry}
      />
    );
  }
  return (
    <>
      <MonthCalendar
        month={month}
        eventDays={eventDays}
        onPrevMonth={() => onMonthChange(-1)}
        onNextMonth={() => onMonthChange(1)}
        onSelectDay={onSelectDay}
      />
      {emptyDay
        ? (
            <Text testID="events-day-empty" variant="body-sm" className="text-center text-ink-variant">
              {translate('events.nothingThisDay')}
            </Text>
          )
        : null}
      {hasEvents
        ? (
            <View className="gap-4" onLayout={e => onListLayout(e.nativeEvent.layout.y)}>
              {children}
            </View>
          )
        : (
            <EmptyState
              testID="events-empty"
              title={translate('events.emptyTitle')}
              body={translate('events.emptyBody')}
            />
          )}
    </>
  );
}

/** Calendar + cards; a cold first load shows their skeleton and crossfades in place (S14-03). */
function EventsBody({ isLoading, onBodyLayout, ...props }: EventsBodyProps) {
  return (
    <SkeletonSwap
      loading={isLoading}
      skeleton={<EventsSkeleton month={props.month} />}
      style={styles.body}
      onLayout={e => onBodyLayout(e.nativeEvent.layout.y)}
    >
      <EventsContent {...props} />
    </SkeletonSwap>
  );
}

const styles = StyleSheet.create({ body: { gap: 16 } });

function useCalendarNavigation(events: ClubEvent[]) {
  const [month, setMonth] = React.useState(() => monthOf(new Date()));
  const [emptyDay, setEmptyDay] = React.useState<string | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const bodyY = React.useRef(0);
  const listY = React.useRef(0);
  const cardY = React.useRef(new Map<string, number>());

  const handleSelectDay = (key: string) => {
    const day = groupEventsByDay(events).get(key);
    const [y, m] = key.split('-').map(Number);
    setMonth({ year: y, month: m - 1 });
    if (!day?.length) {
      setEmptyDay(key);
      return;
    }
    setEmptyDay(null);
    const y0 = cardY.current.get(day[0].id);
    if (y0 !== undefined)
      scrollRef.current?.scrollTo({ y: bodyY.current + listY.current + y0 - 12, animated: true });
  };

  const setBodyY = (y: number) => {
    bodyY.current = y;
  };
  const setListY = (y: number) => {
    listY.current = y;
  };
  const setCardY = (id: string, y: number) => {
    cardY.current.set(id, y);
  };

  const goToMonth = (delta: number) => {
    setEmptyDay(null);
    setMonth(current => shiftMonth(current, delta));
  };

  return { month, emptyDay, goToMonth, handleSelectDay, scrollRef, setBodyY, setListY, setCardY };
}

/** Both event lists, with the first-load / unavailable / refresh state they share. */
function useEventsData(scope: { organizationId: string; memberId: string }) {
  const upcomingQuery = useEvents(scope, 'upcoming');
  const pastQuery = useEvents(scope, 'past');
  const upcomingAll = upcomingQuery.data?.events;
  const pastAll = pastQuery.data?.events;
  const noData = !upcomingAll && !pastAll;
  return {
    upcomingAll,
    pastAll,
    isLoading: noData && (isFirstLoad(upcomingQuery) || isFirstLoad(pastQuery)),
    isUnavailable: noData && (upcomingQuery.isError || pastQuery.isError),
    retrying: upcomingQuery.isFetching || pastQuery.isFetching,
    refetch: () => Promise.all([upcomingQuery.refetch(), pastQuery.refetch()]),
  };
}

export function EventsScreen() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const contentPaddingBottom = useTabBarContentPadding(24);
  const contentPaddingTop = useScreenTopPadding();
  const safeTop = useScreenTopPadding(0);
  const { scrollY, onScroll } = useScrollHeader();

  const memberScope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: user?.id ?? '' }),
    [user?.id],
  );
  const events = useEventsData(memberScope);
  const pull = usePullToRefresh(events.refetch);
  const rsvp = useEventRsvp(memberScope);

  const [typeFilter, setTypeFilter] = React.useState(ALL);
  const { typeChips, upcoming, past, eventDays } = useEventsModel(events.upcomingAll, events.pastAll, typeFilter);

  const openEvent = (id: string) =>
    router.push({ pathname: '/event/[event-id]', params: { 'event-id': id } });

  const handleToggleRsvp = (eventId: string, going: boolean) => rsvp.mutate({ eventId, going });

  const { month, emptyDay, goToMonth, handleSelectDay, scrollRef, setBodyY, setListY, setCardY } = useCalendarNavigation([...upcoming, ...past]);

  const hasEvents = upcoming.length + past.length > 0;

  // First load only; filter changes, refetches and month jumps mount instantly.
  // After a skeleton, the crossfade is the entrance (S14-03).
  const entering = useContentEntrance(hasEvents, events.isLoading);
  const renderCard = (event: ClubEvent, index: number, isPast: boolean) => (
    <TrackedCard
      key={event.id}
      entering={entering(index)}
      event={event}
      past={isPast}
      onLayoutY={y => setCardY(event.id, y)}
      onOpen={() => openEvent(event.id)}
      onToggleRsvp={handleToggleRsvp}
      rsvpPending={rsvp.isPending && rsvp.variables?.eventId === event.id}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenBackground />
      <FocusAwareStatusBar />
      <AnimatedScrollView
        ref={scrollRef}
        refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: 16,
        }}
      >
        <CollapsingTitle scrollY={scrollY}>
          <Text variant="display-lg" accessibilityRole="header">{translate('events.title')}</Text>
        </CollapsingTitle>

        {typeChips.length > 0
          ? (
              <View className="-mx-4">
                <ChipRow
                  testID="events-type-filter"
                  items={typeChips}
                  selectedKey={typeFilter}
                  onSelect={setTypeFilter}
                  contentInset={16}
                />
              </View>
            )
          : null}

        <EventsBody
          isLoading={events.isLoading}
          isUnavailable={events.isUnavailable}
          retrying={events.retrying}
          onRetry={() => void events.refetch()}
          month={month}
          eventDays={eventDays}
          onMonthChange={goToMonth}
          onSelectDay={handleSelectDay}
          emptyDay={emptyDay}
          hasEvents={hasEvents}
          onListLayout={setListY}
          onBodyLayout={setBodyY}
        >
          {upcoming.map((event, i) => renderCard(event, i, false))}
          {past.length > 0
            ? (
                <View className="mt-2">
                  <MonoLabel>{translate('events.pastEvents')}</MonoLabel>
                </View>
              )
            : null}
          {past.map((event, i) => renderCard(event, upcoming.length + i, true))}
        </EventsBody>
      </AnimatedScrollView>
      <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={safeTop} />
      <CompactHeaderBar scrollY={scrollY} title={translate('events.title')} testID="events-compact-header" />
    </View>
  );
}
