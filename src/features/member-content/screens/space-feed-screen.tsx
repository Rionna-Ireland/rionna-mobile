import type { MemberContentState, MemberFeedItem } from '@/features/member-content/types';

import Env from 'env';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { usePostLike } from '@/features/member-content/api/use-post-like';
import { useSpaceFeed } from '@/features/member-content/api/use-space-feed';
import { FeedItemRenderer } from '@/features/member-content/components/feed-item-renderer';
import { usePollVote } from '@/features/polls/api/use-poll-vote';

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
};

function EmptyState({
  testID,
  title,
  message,
}: {
  testID: string;
  title: string;
  message: string;
}) {
  return (
    <View testID={testID} className="rounded-2xl border border-neutral-300 bg-white p-6">
      <Text className="font-sans text-lg font-semibold text-neutral-950">{title}</Text>
      <Text className="mt-2 font-sans text-sm/5 text-neutral-600">{message}</Text>
    </View>
  );
}

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
}: SpaceFeedViewProps) {
  return (
    <ScrollView
      className="flex-1 bg-neutral-100"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
    >
      <View className="mb-6">
        <Text className="font-mono text-[10px] tracking-widest text-violet-700 uppercase">
          Discussion
        </Text>
        <Text className="mt-2 font-sans text-3xl font-semibold text-neutral-950">
          {title}
        </Text>
      </View>

      <View className="gap-4">
        {isLoading && !items
          ? (
              <View testID="space-feed-loading" className="items-center py-16">
                <ActivityIndicator color="#6D28D9" />
                <Text className="mt-3 font-sans text-sm text-neutral-600">
                  Loading the discussion…
                </Text>
              </View>
            )
          : null}
        {!isLoading && contentState === 'empty'
          ? (
              <EmptyState
                testID="space-feed-empty"
                title="No posts yet"
                message="Updates and discussion for this horse will appear here."
              />
            )
          : null}
        {!isLoading && contentState === 'unavailable'
          ? (
              <EmptyState
                testID="space-feed-unavailable"
                title="Discussion unavailable"
                message="Check your connection and pull down to try again."
              />
            )
          : null}
        {items?.map(item => (
          <FeedItemRenderer
            key={item.id}
            item={item}
            onOpen={onOpenPost}
            onToggleLike={onToggleLike}
            likePending={pendingLikePostId === item.id}
            onVote={onVote}
            votePending={item.poll ? pendingVotePollIds.includes(item.poll.id) : false}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export function SpaceFeedScreen() {
  const params = useLocalSearchParams<{ 'space-id': string; 'name'?: string }>();
  const spaceId = params['space-id'] ?? '';
  const title = params.name?.trim() || 'Discussion';
  const router = useRouter();
  const member = useAuthStore.use.user();

  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: member?.id ?? '' }),
    [member?.id],
  );
  const feed = useSpaceFeed(scope, spaceId);
  const like = usePostLike(scope);
  const poll = usePollVote(scope);

  if (!member) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SpaceFeedView
        title={title}
        items={feed.data}
        contentState={feed.contentState}
        isLoading={feed.isLoading}
        isRefetching={feed.isRefetching}
        onRefresh={() => void feed.refetch()}
        onOpenPost={(postSpaceId, postId) => router.push(
          `/post/${encodeURIComponent(postSpaceId)}/${encodeURIComponent(postId)}`,
        )}
        onToggleLike={(postId, liked) => like.toggleLike({ postId, liked })}
        pendingLikePostId={like.pendingPostId}
        onVote={(pollId, optionId) => poll.vote({ pollId, optionId })}
        pendingVotePollIds={poll.pendingPollIds}
      />
    </>
  );
}
