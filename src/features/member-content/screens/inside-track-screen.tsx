import type { MemberContentState, MemberFeedItem } from '@/features/member-content/types';

import Env from 'env';
import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

// Direct module paths (not the barrel) so the screen's test can mock the barrel's Image alone.
import { BrandedRefreshControl, RefreshIndicator, usePullToRefresh } from '@/components/ui/branded-refresh';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { MonoLabel } from '@/components/ui/mono-label';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';
import { SkeletonGroup, SkeletonText } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useInsideTrack } from '@/features/member-content/api/use-inside-track';
import { usePostLike } from '@/features/member-content/api/use-post-like';
import { PostCardSkeleton } from '@/features/member-content/components/feed-skeletons';
import { MemberFeedCard } from '@/features/member-content/components/member-feed-card';
import { translate } from '@/lib/i18n';
import { SkeletonSwap } from '@/lib/motion';

type InsideTrackViewProps = {
  pinned: MemberFeedItem[] | undefined;
  latest: MemberFeedItem[] | undefined;
  contentState: MemberContentState;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onOpenPost: (spaceId: string, postId: string) => void;
  onToggleLike?: (postId: string, liked: boolean) => void;
  pendingLikePostId?: string | null;
};

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View className="mb-4 gap-2">
      <MonoLabel>{eyebrow}</MonoLabel>
      <Text variant="display-sm" accessibilityRole="header">{title}</Text>
    </View>
  );
}

/** First load (A-015): a section header and two post cards, on the section's own rhythm. */
function InsideTrackSkeleton() {
  return (
    <SkeletonGroup testID="inside-track-loading" className="gap-4">
      <View className="mb-4 gap-2">
        <SkeletonText variant="label" width={96} />
        <SkeletonText variant="display-sm" width="45%" />
      </View>
      <PostCardSkeleton />
      <PostCardSkeleton />
    </SkeletonGroup>
  );
}

function FeedCards({
  items,
  onOpenPost,
  onToggleLike,
  pendingLikePostId,
}: {
  items: MemberFeedItem[];
  onOpenPost: (spaceId: string, postId: string) => void;
  onToggleLike?: (postId: string, liked: boolean) => void;
  pendingLikePostId?: string | null;
}) {
  return (
    <>
      {items.map(item => (
        <MemberFeedCard
          key={item.id}
          item={item}
          onOpen={onOpenPost}
          onToggleLike={onToggleLike}
          likePending={pendingLikePostId === item.id}
        />
      ))}
    </>
  );
}

export function InsideTrackView({
  pinned,
  latest,
  contentState,
  isLoading,
  isRefetching,
  onRefresh,
  onOpenPost,
  onToggleLike,
  pendingLikePostId,
}: InsideTrackViewProps) {
  const { scrollY, onScroll } = useScrollHeader();
  const cards = { onOpenPost, onToggleLike, pendingLikePostId };
  const sectionTitle = translate('community.insideTrack.title');
  return (
    <View className="flex-1">
      <AnimatedScrollView
        className="flex-1 bg-secondary-container"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
        refreshControl={<BrandedRefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Text variant="display-lg" accessibilityRole="header" className="mb-6">{sectionTitle}</Text>
        {!isLoading && contentState === 'unavailable'
          ? (
              <ErrorState
                testID="inside-track-unavailable"
                title={translate('community.insideTrack.unavailableTitle')}
                body={translate('community.post.unavailableBody')}
                onRetry={onRefresh}
                retrying={isRefetching}
              />
            )
          : null}
        {!isLoading && contentState === 'empty'
          ? (
              <EmptyState
                testID="inside-track-empty"
                title={translate('community.insideTrack.emptyTitle')}
                body={translate('community.insideTrack.emptyBody')}
              />
            )
          : null}
        <SkeletonSwap loading={isLoading && !pinned && !latest} skeleton={<InsideTrackSkeleton />}>
          {pinned?.length || latest?.length
            ? (
                <>
                  {pinned && pinned.length > 0
                    ? (
                        <View className="mb-8 gap-4">
                          <SectionHeader eyebrow={sectionTitle} title={translate('community.insideTrack.startHere')} />
                          <FeedCards items={pinned} {...cards} />
                        </View>
                      )
                    : null}
                  {latest && latest.length > 0
                    ? (
                        <View className="gap-4">
                          <SectionHeader eyebrow={sectionTitle} title={translate('community.insideTrack.latest')} />
                          <FeedCards items={latest} {...cards} />
                        </View>
                      )
                    : null}
                </>
              )
            : null}
        </SkeletonSwap>
      </AnimatedScrollView>
      <RefreshIndicator scrollY={scrollY} refreshing={isRefetching} top={0} />
    </View>
  );
}

function SignedInInsideTrack({ memberId }: { memberId: string }) {
  const router = useRouter();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId }),
    [memberId],
  );
  const insideTrack = useInsideTrack(scope);
  const like = usePostLike(scope);
  const pull = usePullToRefresh(() => insideTrack.refetch());

  return (
    <InsideTrackView
      pinned={insideTrack.data?.pinned}
      latest={insideTrack.data?.latest}
      contentState={insideTrack.contentState}
      isLoading={insideTrack.isLoading}
      isRefetching={pull.refreshing}
      onRefresh={pull.onRefresh}
      onOpenPost={(spaceId, postId) => router.push(
        `/post/${encodeURIComponent(spaceId)}/${encodeURIComponent(postId)}`,
      )}
      onToggleLike={(postId, liked) => like.toggleLike({ postId, liked })}
      pendingLikePostId={like.pendingPostId}
    />
  );
}

export function InsideTrackScreen() {
  const router = useRouter();
  const member = useAuthStore.use.user();

  if (!member) {
    return null;
  }

  return (
    <View className="flex-1 bg-secondary-container">
      <Stack.Screen options={{ headerShown: false }} />
      <FocusAwareStatusBar />
      <ScreenHeader kicker={translate('community.insideTrack.kicker')} onBack={() => router.back()} />
      <SignedInInsideTrack memberId={member.id} />
    </View>
  );
}
