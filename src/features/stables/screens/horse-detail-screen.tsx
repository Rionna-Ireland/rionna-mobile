import type { LayoutChangeEvent } from 'react-native';
import type { EntryExitAnimationFunction, SharedValue } from 'react-native-reanimated';
import type { HeroDestination } from '@/features/hero-transition/use-hero-destination';
import type { PedigreeRow } from '@/features/stables/lib/horse-facts';
import type { HorseSectionKey } from '@/features/stables/lib/horse-sections';
import type { ScrollMetrics } from '@/features/stables/lib/use-section-scroll-sync';
import type { Entry, HorseDetail, HorseUpdate } from '@/features/stables/types';

import Env from 'env';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  BrandedRefreshControl,
  Button,
  ChipRow,
  EmptyState,
  ErrorState,
  FocusAwareStatusBar,
  RefreshIndicator,
  ScreenBackground,
  ScreenHeader,
  usePullToRefresh,
} from '@/components/ui';
import { useScreenBottomPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView } from '@/components/ui/scroll-header';
import { heroHandoffProgress } from '@/components/ui/scroll-header-math';
import { useHeroApi } from '@/features/hero-transition/hero-transition-provider';
import { useHeroDestination } from '@/features/hero-transition/use-hero-destination';
import { useHorse } from '@/features/stables/api/use-horse';
import { useFollowHorse } from '@/features/stables/api/use-horse-follow';
import { useHorseUpdates } from '@/features/stables/api/use-horse-updates';
import { HorseDetailBar, useHorseDetailBarMetrics } from '@/features/stables/components/horse-detail-bar';
import { HorseHero } from '@/features/stables/components/horse-hero';
import { HorseUpdatesTimeline } from '@/features/stables/components/horse-updates-timeline';
import { RacingSection } from '@/features/stables/components/racing-section';
import { HorseDetailSkeleton } from '@/features/stables/components/stables-skeletons';
import { StorySection } from '@/features/stables/components/story-section';
import { WellbeingSection } from '@/features/stables/components/wellbeing-section';
import {
  buildHorseShareContent,
  getNextEntry,
  getPedigreeRows,
  getResults,
  getStoryText,
  getWellbeingUpdates,
} from '@/features/stables/lib/horse-facts';
import { getVisibleHorseSections } from '@/features/stables/lib/horse-sections';
import { tx } from '@/features/stables/lib/tx';
import { useRefetchFailureNotice } from '@/features/stables/lib/use-refetch-failure-notice';
import { useSectionScrollSync } from '@/features/stables/lib/use-section-scroll-sync';
import { translate } from '@/lib/i18n';
import { fadeUpEntering, heroTransition, isFirstLoad, SkeletonSwap, stagger, useMotion, useSkeletonShown } from '@/lib/motion';

const SECTION_LABELS: Record<HorseSectionKey, Parameters<typeof translate>[0]> = {
  story: 'stables.detail.sections.story',
  racing: 'stables.detail.sections.racing',
  updates: 'stables.detail.sections.updates',
  wellbeing: 'stables.detail.sections.wellbeing',
};

/** Hidden native header: the hero draws its own back/share bar. */
const SCREEN_OPTIONS = { headerShown: false } as const;

/**
 * Back: when the detail was opened by the hero transition, the photo flies
 * back into its source first (S14-05 §4); the iOS edge swipe and Android
 * back skip this and keep the native animation.
 */
function useGoBack(horseId?: string) {
  const router = useRouter();
  const hero = useHeroApi();
  return React.useCallback(() => {
    const pop = () => {
      if (router.canGoBack())
        router.back();
      else
        router.replace('/stables');
    };
    if (hero && horseId && router.canGoBack())
      hero.close(horseId, pop);
    else
      pop();
  }, [router, hero, horseId]);
}

/** 1 at rest; the shared value while the hero transition is in flight. */
function revealOpacity(value: SharedValue<number> | undefined): number {
  'worklet';
  return value ? value.get() : 1;
}

/** Pinned chrome (the back/share bar) fades in after the hero lands. */
function RevealLayer({ value, children }: { value: SharedValue<number> | undefined; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: revealOpacity(value) }));
  return <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** Loading / error / not-found: plain page with a back header (no hero). */
function StateScreen({ children }: { children: React.ReactNode }) {
  const goBack = useGoBack();
  return (
    <View className="flex-1">
      <Stack.Screen options={SCREEN_OPTIONS} />
      <FocusAwareStatusBar />
      <ScreenBackground />
      <ScreenHeader onBack={goBack} backLabel={translate('stables.detail.backA11y')} />
      <View className="flex-1 justify-center px-4 pb-24">{children}</View>
    </View>
  );
}

type SectionsProps = {
  horse: HorseDetail;
  visible: HorseSectionKey[];
  story: string | null;
  pedigree: PedigreeRow[];
  nextEntry: Entry | undefined;
  results: Entry[];
  updates: HorseUpdate[];
  wellbeing: HorseUpdate[];
  onSectionLayout: (key: HorseSectionKey) => (event: LayoutChangeEvent) => void;
  onUpdateLayout: (id: string, y: number) => void;
  onOpenUpdate: (update: HorseUpdate) => void;
  onDiscussion: () => void;
  /** S14-05: content rising in behind the hero transition (index 0 is the chip row). */
  entering?: (index: number) => EntryExitAnimationFunction | undefined;
};

/**
 * The stacked sections. Each wrapper is a direct child of the ScrollView
 * content so its `onLayout` y is a scroll offset (section-chip sync).
 */
function HorseSections(props: SectionsProps) {
  const { horse, visible, onSectionLayout } = props;
  const enteringFor = (key: HorseSectionKey) => props.entering?.(visible.indexOf(key) + 1);
  const section = (key: HorseSectionKey, child: React.ReactNode) => (
    <Animated.View key={key} testID={`section-${key}`} onLayout={onSectionLayout(key)} entering={enteringFor(key)} style={styles.section}>
      {child}
    </Animated.View>
  );
  return (
    <>
      {visible.includes('story') ? section('story', <StorySection story={props.story} pedigree={props.pedigree} />) : null}
      {visible.includes('racing') ? section('racing', <RacingSection nextEntry={props.nextEntry} results={props.results} />) : null}
      {visible.includes('updates') ? section('updates', <HorseUpdatesTimeline updates={props.updates} onItemLayout={props.onUpdateLayout} />) : null}
      {visible.includes('wellbeing') ? section('wellbeing', <WellbeingSection updates={props.wellbeing} onOpenUpdate={props.onOpenUpdate} />) : null}

      {horse.circleSpaceId
        ? (
            <View className="px-4 pt-4">
              <Button
                testID="horse-discussion"
                variant="secondary"
                label={translate('stables.detail.discussion')}
                onPress={props.onDiscussion}
              />
            </View>
          )
        : null}
    </>
  );
}

function useHorseDetailModel(horse: HorseDetail, updates: HorseUpdate[] | undefined) {
  const nextEntry = getNextEntry(horse.entries);
  const results = getResults(horse.entries);
  const story = getStoryText(horse);
  const pedigree = getPedigreeRows(horse);
  const updateList = updates ?? [];
  const wellbeing = getWellbeingUpdates(updateList);
  const visible = getVisibleHorseSections({
    hasStory: Boolean(story),
    hasPedigree: pedigree.length > 0,
    hasNextEntry: Boolean(nextEntry),
    resultCount: results.length,
    updateCount: updateList.length,
    wellbeingCount: wellbeing.length,
  });
  return { nextEntry, results, story, pedigree, updateList, wellbeing, visible };
}

/**
 * Scroll-linked state over the hero, on the UI thread (S14-05 §5): the raw
 * offset (hero parallax/stretch, and the branded refresher, which reads the
 * negative pull), the pinned bar's white → ink handoff (S14-02 §5). The JS
 * side only hears what needs React: the section chips and the status bar.
 */
function useHeroScroll(onScroll: (metrics: ScrollMetrics) => void) {
  const heroHeight = useSharedValue(0);
  const [pastHero, setPastHero] = React.useState(false);
  const { height: barHeight, top: barTop } = useHorseDetailBarMetrics();
  const handoff = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const onScrollJS = React.useCallback((y: number, viewportHeight: number, contentHeight: number) => {
    onScroll({ y, viewportHeight, contentHeight });
    const height = heroHeight.get();
    const next = height > 0 && y > height - 60;
    setPastHero(prev => (prev === next ? prev : next));
  }, [onScroll, heroHeight]);
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.set(y);
      handoff.set(heroHandoffProgress(y, heroHeight.get(), barHeight));
      scheduleOnRN(onScrollJS, y, event.layoutMeasurement.height, event.contentSize.height);
    },
  });
  return { pastHero, heroHeight, handoff, scrollY, barTop, handleScroll };
}

/** Detail content rises in 120ms behind a hero flight (S14-05 §3); otherwise it's just there. */
function useHeroEntrance(dest: HeroDestination, hadSkeleton: boolean) {
  const { reduceMotion } = useMotion();
  const [rises] = React.useState(() => dest.enteredWithHero && !hadSkeleton && !reduceMotion);
  return React.useMemo(() => {
    if (!rises)
      return undefined;
    return (index: number) => fadeUpEntering(Math.min(index, stagger.maxItems - 1), heroTransition.contentDelayMs);
  }, [rises]);
}

type PullRefresh = { refreshing: boolean; onRefresh: () => void };

type HeroProps = { dest: HeroDestination; hadSkeleton: boolean };

/** Share, the Circle discussion and wellbeing → update jumps. */
function useBodyActions(horse: HorseDetail, sync: ReturnType<typeof useSectionScrollSync>) {
  const router = useRouter();
  const { offsetsRef, scrollToOffset, scrollToSection } = sync;
  // Wellbeing rows scroll to their update card in the Updates section.
  const updateOffsetsRef = React.useRef<Record<string, number>>({});
  const handleUpdateLayout = React.useCallback((id: string, y: number) => {
    updateOffsetsRef.current[id] = y;
  }, []);
  const openUpdate = (update: HorseUpdate) => {
    const sectionY = offsetsRef.current.updates;
    const itemY = updateOffsetsRef.current[update.id];
    if (sectionY != null && itemY != null)
      scrollToOffset(sectionY + itemY);
    else
      scrollToSection('updates');
  };

  const handleShare = () => {
    const message = tx('stables.detail.shareMessage', { name: horse.name, club: Env.EXPO_PUBLIC_CLUB_NAME });
    Share.share(buildHorseShareContent(horse, message)).catch(() => {});
  };

  const handleDiscussion = () => {
    if (horse.circleSpaceId) {
      router.push({
        pathname: '/space-feed/[space-id]',
        params: { 'space-id': horse.circleSpaceId, 'name': horse.name },
      });
    }
  };
  return { handleUpdateLayout, openUpdate, handleShare, handleDiscussion };
}

function HorseDetailBody({ horse, updates, pull, dest, hadSkeleton }: { horse: HorseDetail; updates: HorseUpdate[] | undefined; pull: PullRefresh } & HeroProps) {
  const { toggleFollow, pendingHorseId } = useFollowHorse();
  const { reduceMotion } = useMotion();
  const goBack = useGoBack(horse.id);
  const bottomPadding = useScreenBottomPadding(32);
  const model = useHorseDetailModel(horse, updates);
  const sync = useSectionScrollSync(model.visible);
  const { pastHero, heroHeight, handoff, scrollY, barTop, handleScroll } = useHeroScroll(sync.onScroll);
  const actions = useBodyActions(horse, sync);
  const entering = useHeroEntrance(dest, hadSkeleton);
  const { bindScroll } = dest;
  React.useEffect(() => bindScroll(scrollY), [bindScroll, scrollY]);

  const chipItems = model.visible.map(key => ({ key, label: translate(SECTION_LABELS[key]) }));

  return (
    <View className="flex-1">
      <Stack.Screen options={SCREEN_OPTIONS} />
      <FocusAwareStatusBar barStyle={pastHero ? 'dark' : 'light'} />
      <ScreenBackground />
      <AnimatedScrollView
        ref={sync.scrollRef}
        testID="horse-detail-scroll"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
      >
        <View
          onLayout={(e) => {
            heroHeight.set(e.nativeEvent.layout.height);
            dest.onHeroLayout(e.nativeEvent.layout.height);
          }}
        >
          <HorseHero
            horse={horse}
            declaredEntry={model.nextEntry?.status === 'DECLARED' ? model.nextEntry : undefined}
            followPending={pendingHorseId === horse.id}
            onToggleFollow={following => toggleFollow({ horseId: horse.id, following })}
            onBack={goBack}
            onShare={actions.handleShare}
            navBar={false}
            scroll={{ y: scrollY, motion: !reduceMotion }}
            reveal={dest.reveal}
            onPhotoDisplayed={uri => dest.onPhotoDisplayed(uri ?? '')}
            onNameLayout={dest.onNameLayout}
            onPhotoIndexChange={dest.onPhotoIndexChange}
          />
        </View>

        {chipItems.length > 0
          ? (
              <Animated.View entering={entering?.(0)} style={styles.chips}>
                <ChipRow
                  testID="horse-section-chips"
                  items={chipItems}
                  selectedKey={sync.selected}
                  onSelect={key => sync.scrollToSection(key as HorseSectionKey)}
                  contentInset={16}
                />
              </Animated.View>
            )
          : null}

        <HorseSections
          horse={horse}
          visible={model.visible}
          story={model.story}
          pedigree={model.pedigree}
          nextEntry={model.nextEntry}
          results={model.results}
          updates={model.updateList}
          wellbeing={model.wellbeing}
          onSectionLayout={sync.onSectionLayout}
          onUpdateLayout={actions.handleUpdateLayout}
          onOpenUpdate={actions.openUpdate}
          onDiscussion={actions.handleDiscussion}
          entering={entering}
        />
      </AnimatedScrollView>
      <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={barTop} />
      <RevealLayer value={dest.reveal?.details}>
        <HorseDetailBar horseName={horse.name} progress={handoff} onBack={goBack} onShare={actions.handleShare} />
      </RevealLayer>
    </View>
  );
}

/** Cold first load: the hero/sections skeleton under a back-only bar (no horse to share yet). */
function HorseDetailLoading({ horseId, dest }: { horseId?: string; dest: HeroDestination }) {
  const goBack = useGoBack(horseId);
  const { top } = useHorseDetailBarMetrics();
  const handoff = useSharedValue(0);
  return (
    <View className="flex-1">
      <Stack.Screen options={SCREEN_OPTIONS} />
      <FocusAwareStatusBar barStyle="light" />
      <ScreenBackground />
      <HorseDetailSkeleton heroTopPadding={top} heroOpacity={dest.reveal?.shown} />
      <RevealLayer value={dest.reveal?.details}>
        <HorseDetailBar horseName="" progress={handoff} onBack={goBack} />
      </RevealLayer>
    </View>
  );
}

/**
 * Horse detail (S13-04, Figma frame 7): cinematic photo hero, then section
 * chips (Story · Racing · Updates · Wellbeing) that scroll to stacked
 * sections, with the selected chip following the scroll position. A cold
 * first load shows the skeleton, crossfading to the page (S14-03). Opened
 * from a horse photo, the photo flies into the hero (S14-05).
 */
export function HorseDetailScreen() {
  const params = useLocalSearchParams<{ 'horse-id': string }>();
  const horseId = params['horse-id'];
  const horseQuery = useHorse(horseId);
  const { data: horse, isError, refetch, isRefetching } = horseQuery;
  const updatesQuery = useHorseUpdates(horseId);
  const updates = updatesQuery.data;
  const loading = isFirstLoad(horseQuery);
  const hadSkeleton = useSkeletonShown(loading);
  const dest = useHeroDestination(horseId, hadSkeleton);
  const pull = usePullToRefresh(() => Promise.all([horseQuery.refetch(), updatesQuery.refetch()]));
  useRefetchFailureNotice(horseQuery, translate('stables.detail.refreshFailed'));

  // A failed refetch keeps the cached horse (A-006); the error page is only for no data.
  if (!loading && isError && horse === undefined) {
    return (
      <StateScreen>
        <ErrorState testID="horse-error" onRetry={() => refetch()} retrying={isRefetching} />
      </StateScreen>
    );
  }

  if (!loading && !horse) {
    return (
      <StateScreen>
        <EmptyState
          testID="horse-not-found"
          title={translate('stables.detail.notFoundTitle')}
          body={translate('stables.detail.notFoundBody')}
        />
      </StateScreen>
    );
  }

  return (
    <View className="flex-1">
      <SkeletonSwap loading={loading} skeleton={<HorseDetailLoading horseId={horseId} dest={dest} />} style={styles.fill}>
        {horse ? <HorseDetailBody horse={horse} updates={updates} pull={pull} dest={dest} hadSkeleton={hadSkeleton} /> : null}
      </SkeletonSwap>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // pt-5 pb-3 / px-4 pb-2 (Animated views take styles, not classes).
  chips: { paddingTop: 20, paddingBottom: 12 },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
});
