import type { ScrollView } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { HeroRunInput } from '@/features/home/lib/hero-slides';

import Env from 'env';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Submark } from '@/components/brand/logo';
import {
  Avatar,
  BrandedRefreshControl,
  colors,
  ErrorState,
  FocusAwareStatusBar,
  MotionPressable,
  RefreshIndicator,
  ScreenBackground,
  ScreenHeader,
  Text,
  usePullToRefresh,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, CompactHeaderBar, useScrollHeader } from '@/components/ui/scroll-header';
import { useTabScrollToTop } from '@/components/ui/scroll-to-top';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { ArrivalSlot, useArrivalReady } from '@/features/arrival/arrival-slot';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { CharityCard } from '@/features/home/components/charity-card';
import { HeroCarousel } from '@/features/home/components/hero-carousel';
import {
  CharitySkeleton,
  HeroSkeleton,
  HomeBlock,
  InsideTrackSkeleton,
  MyHorsesSkeleton,
  UpcomingEventSkeleton,
} from '@/features/home/components/home-skeletons';
import { InsideTrackCard } from '@/features/home/components/inside-track-card';
import { MyHorsesCard } from '@/features/home/components/my-horses-card';
import { NotificationsBell } from '@/features/home/components/notifications-bell';
import { UpcomingEventCard } from '@/features/home/components/upcoming-event-card';
import { YardChipsRow } from '@/features/home/components/yard-chips-row';
import { pickInsideTrackTeaser } from '@/features/home/lib/card-helpers';
import { greeting } from '@/features/home/lib/greeting';
import { buildHeroSlides } from '@/features/home/lib/hero-slides';
import { useHomeQueries } from '@/features/home/lib/use-home-queries';
import { buildYardChips, countEventsThisWeek, raceDayHorseIds } from '@/features/home/lib/yard-chips';
import { translate } from '@/lib/i18n';
import { isFirstLoad, SkeletonSwap } from '@/lib/motion';

const GUTTER = 16;

/** Device clock, re-read whenever Home regains focus (greeting window, NEW tag). */
function useFocusedNow(): Date {
  const [now, setNow] = React.useState(() => new Date());
  useFocusEffect(React.useCallback(() => {
    setNow(new Date());
  }, []));
  return now;
}

type HomeQueries = ReturnType<typeof useHomeQueries>;

/** S14-04: the Arrival hands off once Home's first-load queries have settled. */
function useHomeArrival(q: HomeQueries) {
  const loading = [q.nextRun, q.followedHorses, q.insideTrack, q.charity, q.upcomingEvents].some(x => x.isLoading);
  useArrivalReady('home', !loading);
}

/** The header submark, wrapped as the Arrival mark's landing slot. */
const HOME_BRAND_MARK = (
  <ArrivalSlot name="home" testID="home-brand-slot">
    <Submark width={36} color={colors.ink} />
  </ArrivalSlot>
);

function useHomeModel(q: HomeQueries, now: Date) {
  const followed = q.followedHorses.data;
  const nextRun: HeroRunInput | null | undefined = q.nextRun.data;

  const chips = React.useMemo(() => {
    const followedIds = new Set((followed ?? []).map(h => h.id));
    return buildYardChips({
      raceDayHorseIds: raceDayHorseIds(nextRun ? [nextRun] : [], followedIds, now),
      unread: q.inboxBadge.data ?? 0,
      eventsThisWeek: countEventsThisWeek(q.upcomingEvents.data?.events ?? [], now),
    });
  }, [followed, nextRun, q.inboxBadge.data, q.upcomingEvents.data, now]);

  const slides = React.useMemo(
    () => buildHeroSlides({
      nextRun,
      news: q.news.data,
      results: q.results.data,
    }, now),
    [nextRun, q.news.data, q.results.data, now],
  );

  return { chips, slides };
}

function HomeHeaderRight({ scope, name }: { scope: { organizationId: string; memberId: string }; name: string | undefined }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3">
      <NotificationsBell scope={scope} />
      <MotionPressable
        size="small"
        hitSlop={2}
        className="rounded-full"
        accessibilityRole="button"
        accessibilityLabel={translate('home.openProfile')}
        testID="home-avatar"
        onPress={() => router.push('/profile')}
      >
        <Avatar ring size={41} name={name} />
      </MotionPressable>
    </View>
  );
}

type HomeBlocksProps = {
  q: HomeQueries;
  slides: ReturnType<typeof useHomeModel>['slides'];
  now: Date;
  heroWidth: number;
  scrollY: SharedValue<number>;
};

type QueryState = { isError: boolean; data: unknown };
const failedCold = (x: QueryState) => x.isError && x.data === undefined;

/**
 * Cold offline / failed load (A-019): the followed horses failed with nothing
 * cached, or two or more blocks did. Then Home says so once, with a retry,
 * instead of an untrue "Follow a horse" over an empty page.
 */
function homeUnavailable(q: HomeQueries) {
  const blocks = [q.nextRun, q.news, q.results, q.followedHorses, q.insideTrack, q.upcomingEvents, q.charity];
  return failedCold(q.followedHorses) || blocks.filter(failedCold).length >= 2;
}

/** The Home cards, each skeleton-first on a cold start (S14-03 §1), cached data straight away. */
function HomeBlocks({ q, slides, now, heroWidth, scrollY }: HomeBlocksProps) {
  const heroLoading = slides.length === 0 && [q.nextRun, q.news, q.results].some(isFirstLoad);
  const unavailable = homeUnavailable(q);
  return (
    <>
      <SkeletonSwap loading={heroLoading} skeleton={<HeroSkeleton width={heroWidth} />}>
        {slides.length > 0 ? <HeroCarousel slides={slides} width={heroWidth} /> : null}
      </SkeletonSwap>
      {unavailable
        ? (
            <ErrorState
              testID="home-unavailable"
              title={translate('home.unavailableTitle')}
              body={translate('home.unavailableBody')}
              onRetry={() => void q.refetchAll()}
              retrying={q.followedHorses.isFetching}
            />
          )
        : (
            <HomeBlock loading={isFirstLoad(q.followedHorses)} skeleton={<MyHorsesSkeleton />} visible entranceIndex={0}>
              {i => <MyHorsesCard horses={q.followedHorses.data} isLoading={q.followedHorses.isLoading} entranceIndex={i} />}
            </HomeBlock>
          )}
      <HomeBlock
        loading={isFirstLoad(q.insideTrack)}
        skeleton={<InsideTrackSkeleton />}
        visible={Boolean(pickInsideTrackTeaser(q.insideTrack.data))}
        entranceIndex={1}
      >
        {i => <InsideTrackCard data={q.insideTrack.data} now={now} entranceIndex={i} />}
      </HomeBlock>
      <HomeBlock loading={isFirstLoad(q.charity)} skeleton={<CharitySkeleton />} visible={Boolean(q.charity.data?.charity)} entranceIndex={2}>
        {i => <CharityCard data={q.charity.data} entranceIndex={i} scrollY={scrollY} />}
      </HomeBlock>
      <HomeBlock
        loading={isFirstLoad(q.upcomingEvents)}
        skeleton={<UpcomingEventSkeleton />}
        visible={Boolean(q.upcomingEvents.data?.events[0])}
        entranceIndex={3}
      >
        {i => <UpcomingEventCard data={q.upcomingEvents.data} entranceIndex={i} />}
      </HomeBlock>
    </>
  );
}

export function HomeScreen() {
  const user = useAuthStore.use.user();
  const { width } = useWindowDimensions();
  const contentPaddingBottom = useTabBarContentPadding(24);
  const now = useFocusedNow();

  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: user?.id ?? '' }),
    [user?.id],
  );

  const q = useHomeQueries(scope);
  useHomeArrival(q);
  const { chips, slides } = useHomeModel(q, now);
  const { scrollY, onScroll } = useScrollHeader();
  const scrollRef = React.useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);
  const pull = usePullToRefresh(q.refetchAll);
  const safeTop = useScreenTopPadding(0);

  return (
    <View className="flex-1">
      <FocusAwareStatusBar barStyle="dark" />
      <ScreenBackground variant="page" />
      <AnimatedScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <ScreenHeader
          variant="tab-root"
          brand
          brandMark={HOME_BRAND_MARK}
          testID="home-header"
          right={<HomeHeaderRight scope={scope} name={user?.name} />}
        />
        <View className="gap-8 px-4 pt-8">
          <Text variant="display-md" accessibilityRole="header" testID="home-greeting">
            {greeting(now, user?.name)}
          </Text>
          <View className="gap-3">
            <YardChipsRow chips={chips} />
            <HomeBlocks q={q} slides={slides} now={now} heroWidth={width - GUTTER * 2} scrollY={scrollY} />
          </View>
        </View>
      </AnimatedScrollView>
      <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={safeTop} />
      {/* No display-lg title on Home (the submark is the header): scrim + hairline only. */}
      <CompactHeaderBar scrollY={scrollY} testID="home-compact-header" />
    </View>
  );
}
