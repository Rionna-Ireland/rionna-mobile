import type { SharedValue } from 'react-native-reanimated';
import type { StablesFilter } from '@/features/stables/lib/stables-filters';
import type { Horse } from '@/features/stables/types';
import type { TxKeyPath } from '@/lib/i18n';

import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

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
} from '@/components/ui';
import { List } from '@/components/ui/list';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { CollapsingTitle, CompactHeaderBar, useScrollHeader } from '@/components/ui/scroll-header';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { heroSourceKey } from '@/features/hero-transition/types';
import { useOpenHorse } from '@/features/hero-transition/use-open-horse';
import { useFollowHorse } from '@/features/stables/api/use-horse-follow';
import { useHorses } from '@/features/stables/api/use-horses';
import { HorseCard } from '@/features/stables/components/horse-card';
import { StablesSkeleton } from '@/features/stables/components/stables-skeletons';
import {
  applyStablesFilter,
  buildStablesFilterChips,
  parseStablesFilterParam,
  resolveStablesFilter,
} from '@/features/stables/lib/stables-filters';
import { translate } from '@/lib/i18n';
import { EntranceItem, isFirstLoad, SkeletonSwap, useContentEntrance } from '@/lib/motion';

const CHIP_LABELS: Record<StablesFilter, TxKeyPath> = {
  all: 'stables.list.filterAll',
  following: 'stables.list.filterFollowing',
  PRE_TRAINING: 'stables.status.preTraining',
  IN_TRAINING: 'stables.status.inTraining',
  REHAB: 'stables.status.rehab',
  RETIRED: 'stables.status.retired',
};

function StablesHeader({
  horses,
  filter,
  onFilterChange,
  scrollY,
}: {
  horses: Horse[];
  filter: StablesFilter;
  onFilterChange: (filter: StablesFilter) => void;
  scrollY: SharedValue<number>;
}) {
  const chips = buildStablesFilterChips(horses).map(chip => ({
    key: chip.key,
    label: translate(CHIP_LABELS[chip.key]),
    count: chip.count,
  }));
  return (
    <View className="gap-8 pb-3">
      <View className="gap-2">
        <CollapsingTitle scrollY={scrollY}>
          <Text variant="display-lg" accessibilityRole="header">{translate('stables.list.title')}</Text>
        </CollapsingTitle>
        <Text variant="body">{translate('stables.list.subtitle')}</Text>
      </View>
      <View className="gap-2.5">
        <MonoLabel>{translate('stables.list.kicker')}</MonoLabel>
        {/* Bleed the chip row to the screen edges; the inset keeps the first chip on the gutter. */}
        <View className="-mx-4">
          <ChipRow
            testID="stables-filter-chips"
            items={chips}
            selectedKey={filter}
            onSelect={key => onFilterChange(key as StablesFilter)}
            contentInset={16}
          />
        </View>
      </View>
    </View>
  );
}

function FilterEmpty({ filter }: { filter: StablesFilter }) {
  return filter === 'following'
    ? (
        <EmptyState
          testID="stables-empty-following"
          title={translate('stables.list.emptyFollowingTitle')}
          body={translate('stables.list.emptyFollowingBody')}
        />
      )
    : (
        <EmptyState
          testID="stables-empty-filter"
          title={translate('stables.list.emptyFilterTitle')}
          body={translate('stables.list.emptyFilterBody')}
        />
      );
}

/** Horse rows: open on press, follow toggle, first-load entrance (S14-02 §6). */
function useHorseRenderItem(ready: boolean, skeletonShowing: boolean) {
  const { toggleFollow, pendingHorseId } = useFollowHorse();
  const openHorse = useOpenHorse();
  const handlePress = React.useCallback(
    (horseId: string) => openHorse(horseId, heroSourceKey('stables', horseId)),
    [openHorse],
  );
  const handleToggleFollow = React.useCallback(
    (horseId: string, following: boolean) => toggleFollow({ horseId, following }),
    [toggleFollow],
  );

  // First load only: FlashList cells mounted or recycled later get no entrance;
  // after a skeleton the crossfade is the entrance (S14-03).
  const entering = useContentEntrance(ready, skeletonShowing);
  return React.useCallback(
    ({ item, index }: { item: Horse; index: number }) => (
      <EntranceItem entering={entering(index)}>
        <HorseCard
          horse={item}
          onPress={() => handlePress(item.id)}
          onToggleFollow={handleToggleFollow}
          followPending={pendingHorseId === item.id}
        />
      </EntranceItem>
    ),
    [entering, handlePress, handleToggleFollow, pendingHorseId],
  );
}

type PagePadding = { paddingTop: number; paddingBottom: number };

function StablesFallback({ isError, retrying, onRetry, pagePadding }: {
  isError: boolean;
  retrying: boolean;
  onRetry: () => void;
  pagePadding: PagePadding;
}) {
  return (
    <View className="flex-1 px-4" style={pagePadding}>
      <View className="gap-2 pb-8">
        <Text variant="display-lg" accessibilityRole="header">{translate('stables.list.title')}</Text>
        <Text variant="body">{translate('stables.list.subtitle')}</Text>
      </View>
      {isError
        ? (
            <ErrorState
              testID="stables-error"
              body={translate('stables.list.errorBody')}
              onRetry={onRetry}
              retrying={retrying}
            />
          )
        : (
            <EmptyState
              testID="stables-empty"
              title={translate('stables.list.emptyTitle')}
              body={translate('stables.list.emptyBody')}
            />
          )}
    </View>
  );
}

/** The tab stays mounted, so a later navigation with a new `filter` param re-applies it (state adjusted in render). */
function useRequestedFilter() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [requested, setRequested] = React.useState<StablesFilter>(() => parseStablesFilterParam(params.filter));
  const [lastParam, setLastParam] = React.useState(params.filter);
  if (params.filter !== lastParam) {
    setLastParam(params.filter);
    setRequested(parseStablesFilterParam(params.filter));
  }
  return [requested, setRequested] as const;
}

/**
 * Stables list (S13-04, Figma frame 6). `?filter=following` preselects the
 * Following chip (S13-08 links with it); anything else opens on All. A cold
 * first load shows the skeleton list, crossfading to the cards (S14-03).
 */
export function StablesScreen() {
  const query = useHorses();
  const { data, isError, refetch, isRefetching } = query;
  const contentPaddingBottom = useTabBarContentPadding(16);
  const contentPaddingTop = useScreenTopPadding(20);
  const safeTop = useScreenTopPadding(0);
  const { scrollY, onScrollJS } = useScrollHeader();
  const pull = usePullToRefresh(refetch);
  const [requested, setRequested] = useRequestedFilter();

  const horses = React.useMemo(() => data ?? [], [data]);
  const filter = resolveStablesFilter(requested, buildStablesFilterChips(horses));
  const filtered = React.useMemo(() => applyStablesFilter(horses, filter), [horses, filter]);

  const loading = isFirstLoad(query);
  const renderItem = useHorseRenderItem(horses.length > 0, loading);
  const showList = !isError && horses.length > 0;
  const pagePadding = { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom };

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />
      <ScreenBackground />
      <SkeletonSwap loading={loading} skeleton={<StablesSkeleton style={pagePadding} />} style={styles.fill}>
        {showList
          ? (
              <List
                data={filtered}
                extraData={filter}
                ListHeaderComponent={(
                  <StablesHeader horses={horses} filter={filter} onFilterChange={setRequested} scrollY={scrollY} />
                )}
                ListEmptyComponent={<FilterEmpty filter={filter} />}
                renderItem={renderItem}
                keyExtractor={(item: Horse) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, ...pagePadding }}
                ItemSeparatorComponent={() => <View className="h-2" />}
                refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
                // FlashList already handles scroll on JS; feed the header from there.
                onScroll={onScrollJS}
                scrollEventThrottle={16}
              />
            )
          : <StablesFallback isError={isError} retrying={isRefetching} onRetry={() => refetch()} pagePadding={pagePadding} />}
      </SkeletonSwap>
      {showList ? <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={safeTop} /> : null}
      {showList ? <CompactHeaderBar scrollY={scrollY} title={translate('stables.list.title')} testID="stables-compact-header" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
