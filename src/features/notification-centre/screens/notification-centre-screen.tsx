import type { InboxItem } from '@/features/notification-centre/types';

import Env from 'env';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import Animated from 'react-native-reanimated';

import {
  ActivityIndicator,
  BrandedRefreshControl,
  FocusAwareStatusBar,
  MonoLabel,
  RefreshIndicator,
  usePullToRefresh,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useInbox } from '@/features/notification-centre/api/use-inbox';
import { useMarkAllRead, useMarkRead, useMarkSeen } from '@/features/notification-centre/api/use-inbox-actions';
import { MenuButton, MenuSheet } from '@/features/notification-centre/components/header-menu';
import { InboxRow } from '@/features/notification-centre/components/inbox-row';
import { InboxEmpty, InboxLoading, InboxUnavailable } from '@/features/notification-centre/components/inbox-states';
import { PreferencesCard } from '@/features/notification-centre/components/preferences-card';
import { groupInboxSections } from '@/features/notification-centre/lib/sections';
import { isPushData, routeToTarget } from '@/features/notifications/deep-link';
import { PageHeader } from '@/features/settings/components/page-header';
import { EntranceItem, isFirstLoad, SkeletonSwap, useContentEntrance } from '@/lib/motion';

const styles = StyleSheet.create({ fill: { flex: 1 } });

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<InboxItem>);

// Rows sit on the 16pt gutter.
const ROW_INSET = { paddingHorizontal: 16 };

// ScreenHeader's kicker row is 44pt tall.
const HEADER_ROW_HEIGHT = 44;

function SectionHeader({ title }: { title: string }) {
  return <MonoLabel className="px-4 pt-5 pb-3">{title}</MonoLabel>;
}

function ItemGap() {
  return <View className="h-3" />;
}

/**
 * First-load entrance keyed by row id, staggered across sections in display
 * order. Rows from later pages, refreshes or scroll-in mounts enter instantly.
 */
function useRowEntrance(sections: { data: InboxItem[] }[], skeletonShowing: boolean) {
  // After a skeleton, its crossfade is the entrance (S14-03).
  const entering = useContentEntrance(sections.length > 0, skeletonShowing);
  const rowIndex = React.useMemo(
    () => new Map(sections.flatMap(section => section.data).map((item, i) => [item.id, i])),
    [sections],
  );
  return (id: string) => entering(rowIndex.get(id) ?? -1);
}

export function NotificationCentreScreen() {
  const user = useAuthStore.use.user();
  const topPadding = useScreenTopPadding();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { scrollY, onScroll } = useScrollHeader();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: user?.id ?? '' }),
    [user?.id],
  );

  const inbox = useInbox(scope);
  const pull = usePullToRefresh(() => inbox.refetch());
  const markRead = useMarkRead(scope);
  const markAll = useMarkAllRead(scope);
  const markSeen = useMarkSeen(scope);

  const items = React.useMemo(() => inbox.data?.pages.flatMap(page => page.items) ?? [], [inbox.data]);
  const sections = React.useMemo(() => groupInboxSections(items, new Date()), [items]);
  const isLoading = isFirstLoad(inbox) && !inbox.data;
  const enteringFor = useRowEntrance(sections, isLoading);

  const markSeenMutate = markSeen.mutate;
  useFocusEffect(React.useCallback(() => {
    markSeenMutate();
  }, [markSeenMutate]));

  const handlePress = React.useCallback((item: InboxItem) => {
    if (item.unread)
      markRead.mutate(item.id);
    if (isPushData(item.data))
      routeToTarget(item.data);
  }, [markRead]);

  const isUnavailable = inbox.isError && !inbox.data;
  const hasUnread = items.some(item => item.unread);
  const toggleMenu = React.useCallback(() => setMenuOpen(open => !open), []);

  let body: React.ReactNode;
  if (isUnavailable || items.length === 0) {
    body = (
      <AnimatedScrollView contentContainerClassName="gap-4 px-4 pt-6 pb-10" onScroll={onScroll} scrollEventThrottle={16}>
        {isUnavailable
          ? <InboxUnavailable onRetry={() => void inbox.refetch()} retrying={inbox.isRefetching} />
          : <InboxEmpty />}
        {isUnavailable ? null : <PreferencesCard />}
      </AnimatedScrollView>
    );
  }
  else {
    body = (
      <AnimatedSectionList
        className="flex-1"
        onScroll={onScroll}
        scrollEventThrottle={16}
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
        renderItem={({ item }) => (
          <EntranceItem entering={enteringFor(item.id)} style={ROW_INSET}>
            <InboxRow item={item} onPress={handlePress} />
          </EntranceItem>
        )}
        ItemSeparatorComponent={ItemGap}
        refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
        onEndReached={() => {
          if (inbox.hasNextPage && !inbox.isFetchingNextPage)
            void inbox.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={(
          <View className="gap-4 px-4 pt-6">
            {inbox.isFetchingNextPage ? <ActivityIndicator /> : null}
            <PreferencesCard />
          </View>
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
        stickySectionHeadersEnabled={false}
      />
    );
  }
  const isList = !isUnavailable && items.length > 0;

  return (
    <View className="flex-1 bg-secondary-container">
      <FocusAwareStatusBar />
      <PageHeader
        kicker="Notifications"
        scrollY={scrollY}
        right={hasUnread ? <MenuButton onPress={toggleMenu} expanded={menuOpen} /> : undefined}
      />
      <SkeletonSwap loading={isLoading} skeleton={<InboxLoading />} style={styles.fill}>
        {body}
        {/* Pinned to the list's top edge, under the fixed page header. */}
        {isList ? <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={0} /> : null}
      </SkeletonSwap>
      {menuOpen && hasUnread
        ? (
            <MenuSheet
              top={topPadding + HEADER_ROW_HEIGHT}
              onDismiss={() => setMenuOpen(false)}
              onMarkAllRead={() => markAll.mutate()}
            />
          )
        : null}
    </View>
  );
}
