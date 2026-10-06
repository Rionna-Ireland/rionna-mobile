import type { MemberContentState, MemberFeedItem } from '@/features/member-content/types';

import Env from 'env';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BrandedRefreshControl,
  EmptyState,
  ErrorState,
  IconButton,
  RefreshIndicator,
  ScreenHeader,
  usePullToRefresh,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { usePostableSpaces } from '@/features/community-posting/api/use-postable-spaces';
import { PlusGlyph } from '@/features/community-posting/components/plus-glyph';
import { usePostLike } from '@/features/member-content/api/use-post-like';
import { useSpaceFeed } from '@/features/member-content/api/use-space-feed';
import { FeedItemRenderer } from '@/features/member-content/components/feed-item-renderer';
import { FeedSkeleton } from '@/features/member-content/components/feed-skeletons';
import { usePollVote } from '@/features/polls/api/use-poll-vote';
import { translate } from '@/lib/i18n';
import { EntranceItem, isFirstLoad, SkeletonSwap, useContentEntrance } from '@/lib/motion';

type SpaceFeedViewProps = {
  title: string;
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
  onBack?: () => void;
  /** Header "+" (new post) — only passed when the space is postable. */
  onNewPost?: () => void;
};

// Stories are merged into the Community feed only, never per-space feeds, so
// FeedItemRenderer's onOpenStory is wired to a no-op here.
function noOpOpenStory() {}

export function SpaceFeedView({
  title,
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
  onBack,
  onNewPost,
}: SpaceFeedViewProps) {
  // First load only; refetches and refreshes mount new rows instantly. After a
  // skeleton, its crossfade is the entrance (S14-03).
  const entering = useContentEntrance(Boolean(items?.length), isLoading && !items);
  const { scrollY, onScroll } = useScrollHeader();
  const safeTop = useScreenTopPadding(0);
  return (
    <View className="flex-1 bg-surface">
      <AnimatedScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<BrandedRefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <ScreenHeader
          kicker={translate('community.space.kicker')}
          title={title}
          onBack={onBack}
          right={onNewPost
            ? (
                <IconButton
                  testID="space-feed-new-post"
                  variant="square-accent"
                  accessibilityLabel={translate('community.space.newPostA11y')}
                  onPress={onNewPost}
                  // The header's right slot pulls 12pt outward for bare icons;
                  // a filled button must sit on the 16pt gutter like the cards.
                  className="mr-3 size-11"
                >
                  <PlusGlyph size={20} />
                </IconButton>
              )
            : undefined}
          className="pb-6"
        />

        <View className="gap-3 px-4">
          {!isLoading && contentState === 'empty'
            ? (
                <EmptyState
                  testID="space-feed-empty"
                  title={translate('community.space.emptyTitle')}
                  body={translate('community.space.emptyBody')}
                />
              )
            : null}
          {!isLoading && contentState === 'unavailable'
            ? (
                <ErrorState
                  testID="space-feed-unavailable"
                  title={translate('community.space.unavailableTitle')}
                  body={translate('community.post.unavailableBody')}
                  onRetry={onRefresh}
                />
              )
            : null}
          <SkeletonSwap
            loading={isLoading && !items}
            skeleton={<FeedSkeleton testID="space-feed-loading" />}
            style={styles.posts}
          >
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
                      onOpenStory={noOpOpenStory}
                    />
                  </EntranceItem>
                ))
              : null}
          </SkeletonSwap>
        </View>
      </AnimatedScrollView>
      <RefreshIndicator scrollY={scrollY} refreshing={isRefetching} top={safeTop} />
    </View>
  );
}

const styles = StyleSheet.create({ posts: { gap: 12 } });

export function SpaceFeedScreen() {
  const params = useLocalSearchParams<{ 'space-id': string; 'name'?: string }>();
  const spaceId = params['space-id'] ?? '';
  const title = params.name?.trim() || translate('community.space.kicker');
  const router = useRouter();
  const member = useAuthStore.use.user();

  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: member?.id ?? '' }),
    [member?.id],
  );
  const feed = useSpaceFeed(scope, spaceId);
  const like = usePostLike(scope);
  const poll = usePollVote(scope);
  const spacesQuery = usePostableSpaces(scope);
  const isPostable = (spacesQuery.data?.spaces ?? []).some(space => space.id === spaceId);
  const pull = usePullToRefresh(() => feed.refetch());

  if (!member) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SpaceFeedView
        title={title}
        items={feed.data}
        contentState={feed.contentState}
        isLoading={isFirstLoad(feed)}
        isRefetching={pull.refreshing}
        onRefresh={pull.onRefresh}
        onOpenPost={(postSpaceId, postId) => router.push(
          `/post/${encodeURIComponent(postSpaceId)}/${encodeURIComponent(postId)}`,
        )}
        onToggleLike={(postId, liked) => like.toggleLike({ postId, liked })}
        pendingLikePostId={like.pendingPostId}
        onVote={(pollId, optionId) => poll.vote({ pollId, optionId })}
        pendingVotePollIds={poll.pendingPollIds}
        onBack={() => router.back()}
        onNewPost={isPostable
          ? () => router.push(`/post/new?spaceId=${encodeURIComponent(spaceId)}`)
          : undefined}
      />
    </>
  );
}
