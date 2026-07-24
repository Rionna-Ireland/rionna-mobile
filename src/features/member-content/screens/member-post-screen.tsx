import type { MemberContentState, MemberPostDetail } from '@/features/member-content/types';

import Env from 'env';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Image } from '@/components/ui';
import { Heart } from '@/components/ui/icons';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useMemberPost } from '@/features/member-content/api/use-member-post';
import { usePostLike } from '@/features/member-content/api/use-post-like';
import { CircleTiptapRenderer } from '@/features/member-content/components/circle-tiptap-renderer';
import { formatCount, formatMemberContentDate } from '@/features/member-content/lib/content-format';
import { hydrateCircleDoc } from '@/features/member-content/tiptap/hydrate';
import { circleDocHasContent } from '@/features/member-content/tiptap/native-support';

type MemberPostViewProps = {
  post: MemberPostDetail | undefined;
  contentState: MemberContentState;
  isLoading?: boolean;
  onOpenUrl?: (url: string) => void;
  onRetry?: () => void;
  /** Wire to flip the like; omitted → read-only count. */
  onToggleLike?: (postId: string, liked: boolean) => void;
  /** Disables the heart while the like mutation is in flight. */
  likePending?: boolean;
};

function PostUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <View testID="member-post-unavailable" className="flex-1 items-center justify-center bg-neutral-100 px-8">
      <Text className="font-sans text-xl font-semibold text-neutral-950">Post unavailable</Text>
      <Text className="mt-2 text-center font-sans text-sm/5 text-neutral-600">
        Check your connection and try again.
      </Text>
      {onRetry
        ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry post"
              className="mt-5 h-11 items-center justify-center rounded-xl border border-violet-700 bg-white px-6"
              onPress={onRetry}
            >
              <Text className="font-sans text-sm font-semibold text-violet-800">Try again</Text>
            </Pressable>
          )
        : null}
    </View>
  );
}

function PostAuthor({ post }: { post: MemberPostDetail }) {
  const authorName = post.authorName?.trim() || 'Rionna member';
  return (
    <View className="mt-5 flex-row items-center gap-3">
      {post.authorAvatarUrl
        ? (
            <Image
              source={{ uri: post.authorAvatarUrl }}
              className="size-10 rounded-full bg-neutral-200"
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`${authorName} avatar`}
            />
          )
        : (
            <View className="size-10 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100">
              <Text className="font-sans text-sm font-semibold text-neutral-800">
                {authorName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
      <Text className="font-sans text-sm font-medium text-neutral-800">{authorName}</Text>
    </View>
  );
}

function PostLikeControl({
  post,
  onToggleLike,
  likePending = false,
}: {
  post: MemberPostDetail;
  onToggleLike?: (postId: string, liked: boolean) => void;
  likePending?: boolean;
}) {
  const countLabel = formatCount(post.likeCount, 'like', 'likes');
  if (!onToggleLike) {
    return <Text className="font-sans text-xs text-neutral-500">{countLabel}</Text>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={post.isLiked ? 'Unlike post' : 'Like post'}
      disabled={likePending}
      hitSlop={8}
      onPress={() => onToggleLike(post.id, !post.isLiked)}
      className="flex-row items-center gap-1.5"
    >
      <Heart
        width={16}
        height={16}
        filled={post.isLiked}
        color={post.isLiked ? '#BE123C' : '#737373'}
      />
      <Text
        className={
          post.isLiked
            ? 'font-sans text-xs font-medium text-rose-700'
            : 'font-sans text-xs text-neutral-500'
        }
      >
        {countLabel}
      </Text>
    </Pressable>
  );
}

export function MemberPostView({
  post,
  contentState,
  isLoading = false,
  onOpenUrl,
  onRetry,
  onToggleLike,
  likePending,
}: MemberPostViewProps) {
  if (isLoading && !post) {
    return (
      <View testID="member-post-loading" className="flex-1 items-center justify-center bg-neutral-100">
        <ActivityIndicator color="#6D28D9" />
        <Text className="mt-3 font-sans text-sm text-neutral-600">Loading post…</Text>
      </View>
    );
  }

  if (!post) {
    return <PostUnavailable onRetry={onRetry} />;
  }

  const hydratedDoc = hydrateCircleDoc({
    body: post.tiptapDoc,
    sgids_to_object_map: post.embeds,
    inline_attachments: post.inlineAttachments,
  });
  const meta = [post.spaceName, formatMemberContentDate(post.createdAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      className="flex-1 bg-neutral-100"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
    >
      {contentState === 'saved'
        ? (
            <View className="mb-4 rounded-xl border border-violet-300 bg-violet-50 px-4 py-3">
              <Text className="font-sans text-sm font-medium text-violet-900">
                Showing saved content
              </Text>
            </View>
          )
        : null}

      <View className="overflow-hidden rounded-2xl border border-neutral-300 bg-white">
        {post.imageUrl
          ? (
              <Image
                source={{ uri: post.imageUrl }}
                className="aspect-video w-full bg-neutral-200"
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={post.title}
              />
            )
          : null}
        <View className="p-5">
          {meta
            ? (
                <Text className="font-mono text-[10px] tracking-wider text-neutral-500 uppercase">
                  {meta}
                </Text>
              )
            : null}
          <Text className="mt-3 font-sans text-3xl/9 font-semibold text-neutral-950">
            {post.title}
          </Text>
          <PostAuthor post={post} />
          <View className="mt-4 flex-row items-center gap-4 border-b border-neutral-200 pb-5">
            <PostLikeControl post={post} onToggleLike={onToggleLike} likePending={likePending} />
            <Text className="font-sans text-xs text-neutral-500">
              {formatCount(post.commentCount, 'comment', 'comments')}
            </Text>
          </View>
          <View className="mt-5">
            {circleDocHasContent(hydratedDoc)
              ? <CircleTiptapRenderer doc={hydratedDoc} onOpenUrl={onOpenUrl} />
              : (
                  <Text className="font-sans text-base/6 text-neutral-900">
                    {post.bodyText ?? 'This post has no readable content yet.'}
                  </Text>
                )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SignedInMemberPost({
  memberId,
  spaceId,
  postId,
}: {
  memberId: string;
  spaceId: string;
  postId: string;
}) {
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId }),
    [memberId],
  );
  const post = useMemberPost(scope, spaceId, postId);
  const like = usePostLike(scope);

  return (
    <MemberPostView
      post={post.data}
      contentState={post.contentState}
      isLoading={post.isLoading}
      onOpenUrl={url => void Linking.openURL(url)}
      onRetry={() => void post.refetch()}
      onToggleLike={(likedPostId, liked) => like.toggleLike({ postId: likedPostId, liked })}
      likePending={like.isPending}
    />
  );
}

export function MemberPostScreen() {
  const member = useAuthStore.use.user();
  const params = useLocalSearchParams<{
    'space-id'?: string;
    'post-id'?: string;
  }>();
  const spaceId = params['space-id'];
  const postId = params['post-id'];
  if (!member || typeof spaceId !== 'string' || typeof postId !== 'string') {
    return (
      <MemberPostView
        post={undefined}
        contentState="unavailable"
      />
    );
  }
  return <SignedInMemberPost memberId={member.id} spaceId={spaceId} postId={postId} />;
}
