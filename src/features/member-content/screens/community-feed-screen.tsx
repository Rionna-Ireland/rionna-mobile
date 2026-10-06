import type { FeaturedCardData } from '@/features/member-content/components/featured-card';
import type { FeedChip, MemberContentState, MemberFeedItem } from '@/features/member-content/types';
import type { AuthUser } from '@/lib/auth/utils';

import Env from 'env';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BrandedRefreshControl,
  EmptyState,
  ErrorState,
  Gradient,
  RefreshIndicator,
  Text,
  usePullToRefresh,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, CollapsingTitle, CompactHeaderBar, useScrollHeader } from '@/components/ui/scroll-header';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { NewPostButton } from '@/features/community-posting/components/new-post-button';
import { useFeedChips } from '@/features/member-content/api/use-feed-chips';
import { useMemberFeed } from '@/features/member-content/api/use-member-feed';
import { usePostLike } from '@/features/member-content/api/use-post-like';
import { AnnouncementCarousel } from '@/features/member-content/components/announcement-carousel';
import { FeaturedCard } from '@/features/member-content/components/featured-card';
import { FeedChipRow } from '@/features/member-content/components/feed-chip-row';
import { FeedItemRenderer } from '@/features/member-content/components/feed-item-renderer';
import { FeedSkeleton } from '@/features/member-content/components/feed-skeletons';
import { announcementSpaceIdsFromChips, selectAnnouncements } from '@/features/member-content/lib/announcements';
import { chipToFilter } from '@/features/member-content/lib/chip-filter';
import { useFeedChipSelection } from '@/features/member-content/lib/use-feed-chip-selection';
import { usePollVote } from '@/features/polls/api/use-poll-vote';
import { EntranceItem, isFirstLoad, SkeletonSwap, useContentEntrance } from '@/lib/motion';

type CommunityFeedViewProps = {
  items: MemberFeedItem[] | undefined;
  contentState: MemberContentState;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onOpenPost: (spaceId: string, postId: string) => void;
  onToggleLike?: (postId: string, liked: boolean) => void;
  pendingLikePostId?: string | null;
  onVote: (pollId: string, optionId: string) => void;
  pendingVotePollIds: string[];
  onOpenStory: (slug: string) => void;
  chips?: FeedChip[];
  selectedChipId?: string;
  onSelectChip?: (id: string) => void;
  emptyCopy?: { title: string; message: string };
  /** Top-right action (the "+" new-post button). */
  headerRight?: React.ReactNode;
  /** Live Q&A slot — S13-11 supplies this; nothing renders without it. */
  featuredCard?: FeaturedCardData | null;
  onOpenFeaturedCard?: (id: string) => void;
};

const DEFAULT_EMPTY_COPY = {
  title: 'Nothing new yet',
  message: 'New updates from your live circles will appear here.',
};

/** Per-chip empty copy (S12-02b) — falls back to the default feed copy for the "all" chip. */
export function emptyCopyForChip(chip: FeedChip | undefined): { title: string; message: string } {
  if (!chip) {
    return DEFAULT_EMPTY_COPY;
  }
  switch (chip.kind) {
    case 'space':
      return { title: `Nothing in ${chip.label} yet`, message: 'Start the first post.' };
    case 'horses':
      return {
        title: 'Nothing from your horses yet',
        message: 'Follow a horse to see its space here.',
      };
    case 'polls':
      return { title: 'No polls right now', message: '' };
    case 'news':
    case 'charity':
      return { title: 'No stories yet', message: '' };
    default:
      return DEFAULT_EMPTY_COPY;
  }
}

export function CommunityFeedView({
  items,
  contentState,
  isLoading,
  isRefetching,
  onRefresh,
  onOpenPost,
  onToggleLike,
  pendingLikePostId,
  onVote,
  pendingVotePollIds,
  onOpenStory,
  chips = [],
  selectedChipId = 'all',
  onSelectChip = () => {},
  emptyCopy = DEFAULT_EMPTY_COPY,
  headerRight,
  featuredCard,
  onOpenFeaturedCard,
}: CommunityFeedViewProps) {
  const contentPaddingBottom = useTabBarContentPadding(24);
  const contentPaddingTop = useScreenTopPadding();
  const safeTop = useScreenTopPadding(0);
  const announcements = React.useMemo(
    () => selectAnnouncements(items, announcementSpaceIdsFromChips(chips)),
    [items, chips],
  );
  const { scrollY, onScroll } = useScrollHeader();
  // First load only; chip switches, refetches and refreshes mount rows instantly.
  // After a skeleton, its crossfade is the entrance (S14-03).
  const entering = useContentEntrance(Boolean(items?.length), isLoading && !items);

  return (
    <View className="flex-1">
      <AnimatedScrollView
        className="flex-1 bg-surface"
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        refreshControl={<BrandedRefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* The gradient covers the header + featured area only; posts sit on plain surface. */}
        <View className="gap-4 pb-6" style={{ paddingTop: contentPaddingTop }}>
          <Gradient variant="page" pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View className="flex-row items-center justify-between px-4">
            <CollapsingTitle scrollY={scrollY}>
              <Text variant="display-lg" accessibilityRole="header">Community</Text>
            </CollapsingTitle>
            {headerRight}
          </View>
          <FeedChipRow chips={chips} selectedId={selectedChipId} onSelect={onSelectChip} contentInset={16} />
          <AnnouncementCarousel announcements={announcements} onOpen={onOpenPost} />
          {featuredCard
            ? (
                <View className="px-4">
                  <FeaturedCard card={featuredCard} onPress={onOpenFeaturedCard} />
                </View>
              )
            : null}
        </View>

        <View className="gap-3 px-4">
          {contentState === 'saved'
            ? (
                <View className="rounded-lg bg-primary-fixed px-4 py-3">
                  <Text variant="body-sm" className="font-sans-medium">Showing saved content</Text>
                </View>
              )
            : null}
          {!isLoading && contentState === 'empty'
            ? <EmptyState testID="member-feed-empty" title={emptyCopy.title} body={emptyCopy.message || undefined} />
            : null}
          {!isLoading && contentState === 'unavailable'
            ? (
                <ErrorState
                  testID="member-feed-unavailable"
                  title="Feed unavailable"
                  body="Check your connection and try again."
                  onRetry={onRefresh}
                />
              )
            : null}
          <SkeletonSwap loading={isLoading && !items} skeleton={<FeedSkeleton />} style={styles.posts}>
            {items?.length
              ? items.map((item, i) => (
                  <EntranceItem key={item.id} entering={entering(i)}>
                    <FeedItemRenderer
                      item={item}
                      onOpen={onOpenPost}
                      onToggleLike={onToggleLike}
                      likePending={pendingLikePostId === item.id}
                      onVote={onVote}
                      votePending={item.poll ? pendingVotePollIds.includes(item.poll.id) : false}
                      onOpenStory={onOpenStory}
                    />
                  </EntranceItem>
                ))
              : null}
          </SkeletonSwap>
        </View>
      </AnimatedScrollView>
      <RefreshIndicator scrollY={scrollY} refreshing={isRefetching} top={safeTop} />
      <CompactHeaderBar scrollY={scrollY} title="Community" testID="community-compact-header" />
    </View>
  );
}

function SignedInCommunityFeed({ member }: { member: AuthUser }) {
  const router = useRouter();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: member.id }),
    [member.id],
  );
  const chipsQuery = useFeedChips(scope);
  const chips = chipsQuery.data?.chips ?? [];
  const chipSelection = useFeedChipSelection(scope, chips);
  const filter = chipSelection.selectedChip ? chipToFilter(chipSelection.selectedChip) : undefined;
  const feed = useMemberFeed(scope, filter);
  const like = usePostLike(scope);
  const poll = usePollVote(scope);
  const pull = usePullToRefresh(() => feed.refetch());

  return (
    <View className="flex-1">
      <CommunityFeedView
        items={feed.data}
        contentState={feed.contentState}
        isLoading={isFirstLoad(feed)}
        isRefetching={pull.refreshing}
        onRefresh={pull.onRefresh}
        onOpenPost={(spaceId, postId) => router.push(
          `/post/${encodeURIComponent(spaceId)}/${encodeURIComponent(postId)}`,
        )}
        onToggleLike={(postId, liked) => like.toggleLike({ postId, liked })}
        pendingLikePostId={like.pendingPostId}
        onVote={(pollId, optionId) => poll.vote({ pollId, optionId })}
        pendingVotePollIds={poll.pendingPollIds}
        onOpenStory={slug => router.push(`/news/${encodeURIComponent(slug)}`)}
        chips={chips}
        selectedChipId={chipSelection.selectedId}
        onSelectChip={chipSelection.select}
        emptyCopy={emptyCopyForChip(chipSelection.selectedChip)}
        headerRight={<NewPostButton scope={scope} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({ posts: { gap: 12 } });

export function CommunityFeedScreen() {
  const member = useAuthStore.use.user();
  return member ? <SignedInCommunityFeed member={member} /> : null;
}
