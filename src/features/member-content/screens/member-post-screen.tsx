import type { MemberContentState, MemberPostDetail } from '@/features/member-content/types';

import Env from 'env';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';

import { Image } from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useMemberPost } from '@/features/member-content/api/use-member-post';
import { CircleTiptapRenderer } from '@/features/member-content/components/circle-tiptap-renderer';
import { hydrateCircleDoc } from '@/features/member-content/tiptap/hydrate';
import { circleDocHasContent } from '@/features/member-content/tiptap/native-support';

type MemberPostViewProps = {
  post: MemberPostDetail | undefined;
  contentState: MemberContentState;
  isLoading?: boolean;
  onOpenUrl?: (url: string) => void;
};

function countLabel(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatDate(value: string | null): string | null {
  if (!value)
    return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return null;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberPostView({
  post,
  contentState,
  isLoading = false,
  onOpenUrl,
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
    return (
      <View testID="member-post-unavailable" className="flex-1 items-center justify-center bg-neutral-100 px-8">
        <Text className="font-sans text-xl font-semibold text-neutral-950">Post unavailable</Text>
        <Text className="mt-2 text-center font-sans text-sm/5 text-neutral-600">
          Check your connection and try again.
        </Text>
      </View>
    );
  }

  const hydratedDoc = hydrateCircleDoc({
    body: post.tiptapDoc,
    sgids_to_object_map: post.embeds,
    inline_attachments: post.inlineAttachments,
  });
  const meta = [post.spaceName, post.authorName, formatDate(post.createdAt)]
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
          <View className="mt-4 flex-row gap-4 border-b border-neutral-200 pb-5">
            <Text className="font-sans text-xs text-neutral-500">
              {countLabel(post.likeCount, 'like', 'likes')}
            </Text>
            <Text className="font-sans text-xs text-neutral-500">
              {countLabel(post.commentCount, 'comment', 'comments')}
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

  return (
    <MemberPostView
      post={post.data}
      contentState={post.contentState}
      isLoading={post.isLoading}
      onOpenUrl={url => void Linking.openURL(url)}
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
