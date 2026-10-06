import type { ReportTarget } from '@/features/community-posting/types';
import type { CommentHandlers } from '@/features/member-content/components/thread-comments';
import type {
  MemberContentState,
  MemberPostDetail,
  PostComment,
} from '@/features/member-content/types';

import { HeaderHeightContext } from '@react-navigation/elements';
import Env from 'env';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import {
  BrandedRefreshControl,
  Button,
  Card,
  Image,
  RefreshIndicator,
  ScreenHeader,
  Text,
  usePullToRefresh,
} from '@/components/ui';
import colors from '@/components/ui/colors';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { PostOverflowMenu } from '@/features/community-posting/components/post-overflow-menu';
import { ReportSheet } from '@/features/community-posting/components/report-sheet';
import { useMemberPost } from '@/features/member-content/api/use-member-post';
import {
  useAddComment,
  useDeleteComment,
  usePostComments,
} from '@/features/member-content/api/use-post-comments';
import { usePostLike } from '@/features/member-content/api/use-post-like';
import { CircleTiptapRenderer } from '@/features/member-content/components/circle-tiptap-renderer';
import { ActivityRow, AuthorHeader } from '@/features/member-content/components/post-parts';
import { CommentComposer, CommentsSection } from '@/features/member-content/components/thread-comments';
import { ThreadSkeleton } from '@/features/member-content/components/thread-skeleton';
import { formatRelativeTime } from '@/features/member-content/lib/space-tag';
import { hydrateCircleDoc } from '@/features/member-content/tiptap/hydrate';
import { circleDocHasContent } from '@/features/member-content/tiptap/native-support';
import { translate } from '@/lib/i18n';
import { SkeletonSwap } from '@/lib/motion';

const REPORT_EXCERPT_MAX = 200;

type MemberPostViewProps = CommentHandlers & {
  post: MemberPostDetail | undefined;
  contentState: MemberContentState;
  isLoading?: boolean;
  onOpenUrl?: (url: string) => void;
  onRetry?: () => void;
  /** Pull-to-refresh: reloads the post and its comments. Omitted → no pull. */
  onRefresh?: () => unknown;
  /** Reloads the comments alone (their failed state's Try again). */
  onRetryComments?: () => void;
  /** Back action for the kicker header. */
  onBack?: () => void;
  /** Right slot of the kicker header (the post overflow menu). */
  headerRight?: React.ReactNode;
  /** Wire to flip the like; omitted → read-only count. */
  onToggleLike?: (postId: string, liked: boolean) => void;
  /** Disables the heart while the like mutation is in flight. */
  likePending?: boolean;
  /** The post's comments; undefined hides the whole comments section. */
  comments?: PostComment[];
  /** Server total for the "Replies (N)" label; falls back to the loaded count. */
  commentsTotal?: number | null;
  /** Comments failed to load (post itself may still be fine). */
  commentsUnavailable?: boolean;
  /** Wire to enable the composer; omitted → read-only comments. */
  onSubmitComment?: (postId: string, body: string) => void;
  /** Disables the composer while a comment is in flight. */
  commentSubmitting?: boolean;
  /** Set after a failed submit: 'blocked' (auto-moderation) or 'failed'; the composer keeps the text. */
  commentError?: 'blocked' | 'failed' | null;
};

function PostUnavailable({ onRetry, onBack }: { onRetry?: () => void; onBack?: () => void }) {
  return (
    <View testID="member-post-unavailable" className="flex-1 bg-surface">
      <ScreenHeader kicker={translate('community.post.kicker')} onBack={onBack} />
      <View className="flex-1 items-center justify-center px-8">
        <Text variant="display-sm">{translate('community.post.unavailableTitle')}</Text>
        <Text variant="body" className="mt-2 text-center text-ink-variant">
          {translate('community.post.unavailableBody')}
        </Text>
        {onRetry
          ? (
              <Button
                variant="secondary"
                size="md"
                fullWidth={false}
                className="mt-5"
                label={translate('common.tryAgain')}
                accessibilityLabel={translate('community.post.retryA11y')}
                onPress={onRetry}
              />
            )
          : null}
      </View>
    </View>
  );
}

function PostCard({
  post,
  hydratedDoc,
  onOpenUrl,
  onToggleLike,
  likePending,
}: {
  post: MemberPostDetail;
  hydratedDoc: ReturnType<typeof hydrateCircleDoc>;
  onOpenUrl?: (url: string) => void;
  onToggleLike?: (postId: string, liked: boolean) => void;
  likePending?: boolean;
}) {
  return (
    <Card className="gap-4 border border-on-primary-container">
      <AuthorHeader
        name={post.authorName}
        avatarUrl={post.authorAvatarUrl}
        time={formatRelativeTime(post.createdAt)}
        spaceName={post.spaceName}
        spaceId={post.spaceId}
        role={post.authorRole}
      />
      {post.title ? <Text variant="display-sm">{post.title}</Text> : null}
      {post.imageUrl
        ? (
            <Image
              source={{ uri: post.imageUrl }}
              className="aspect-video w-full rounded-md bg-secondary-container"
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={post.title}
            />
          )
        : null}
      {circleDocHasContent(hydratedDoc)
        ? <CircleTiptapRenderer doc={hydratedDoc} onOpenUrl={onOpenUrl} />
        : (
            <Text variant="body-lg" className="text-ink-variant">
              {post.bodyText ?? translate('community.post.noContent')}
            </Text>
          )}
      <ActivityRow
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        isLiked={post.isLiked}
        likePending={likePending}
        onToggleLike={onToggleLike ? () => onToggleLike(post.id, !post.isLiked) : undefined}
      />
    </Card>
  );
}

type ThreadBodyProps = Omit<MemberPostViewProps, 'post' | 'isLoading' | 'onRetry' | 'onBack' | 'headerRight'> & {
  post: MemberPostDetail;
};

/** The loaded thread: post, comments (pull to refresh, S14-03 refresher) and the reply composer. */
function ThreadBody({
  post,
  contentState,
  onOpenUrl,
  onRefresh,
  onRetryComments,
  onToggleLike,
  likePending,
  comments,
  commentsTotal,
  commentsUnavailable = false,
  onSubmitComment,
  commentSubmitting,
  commentError,
  ...handlers
}: ThreadBodyProps) {
  const { scrollY, onScroll } = useScrollHeader();
  const pull = usePullToRefresh(onRefresh ?? noop);
  const hydratedDoc = hydrateCircleDoc({
    body: post.tiptapDoc,
    sgids_to_object_map: post.embeds,
    inline_attachments: post.inlineAttachments,
  });
  const showComments = comments !== undefined || commentsUnavailable;

  return (
    <>
      <View className="flex-1">
        <AnimatedScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={onRefresh ? <BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} /> : undefined}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {contentState === 'saved'
            ? (
                <View className="mb-3 rounded-lg bg-primary-fixed px-4 py-3">
                  <Text variant="body-sm" className="font-sans-medium">{translate('community.savedContent')}</Text>
                </View>
              )
            : null}
          <PostCard post={post} hydratedDoc={hydratedDoc} onOpenUrl={onOpenUrl} onToggleLike={onToggleLike} likePending={likePending} />
          {showComments
            ? (
                <CommentsSection
                  postId={post.id}
                  comments={comments}
                  total={commentsTotal ?? comments?.length ?? 0}
                  commentsUnavailable={commentsUnavailable}
                  onRetryComments={onRetryComments}
                  {...handlers}
                />
              )
            : null}
        </AnimatedScrollView>
        {onRefresh ? <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={0} /> : null}
      </View>
      {showComments && onSubmitComment
        ? (
            <CommentComposer
              postId={post.id}
              onSubmitComment={onSubmitComment}
              commentSubmitting={commentSubmitting}
              commentError={commentError}
            />
          )
        : null}
    </>
  );
}

function noop() {}

export function MemberPostView({ post, isLoading = false, onRetry, onBack, headerRight, ...rest }: MemberPostViewProps) {
  // Offset for any native header above the screen (0 when the kicker header
  // replaces it, and outside a navigator, e.g. unit tests).
  const headerHeight = React.use(HeaderHeightContext) ?? 0;
  const loading = isLoading && !post;

  if (!loading && !post) {
    return <PostUnavailable onRetry={onRetry} onBack={onBack} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <ScreenHeader kicker={translate('community.post.kicker')} onBack={onBack} right={post ? headerRight : undefined} className="pb-3" />
      {/* First load: a skeleton of the thread, crossfading to it (S14-08 A-015). */}
      <SkeletonSwap loading={loading} skeleton={<ThreadSkeleton />} style={styles.fill}>
        {post ? <ThreadBody post={post} {...rest} /> : null}
      </SkeletonSwap>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
});

/** First `REPORT_EXCERPT_MAX` characters of the reported text, defaulting to an empty excerpt. */
function reportExcerpt(text: string | null | undefined) {
  return (text ?? '').slice(0, REPORT_EXCERPT_MAX);
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
  const router = useRouter();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId }),
    [memberId],
  );
  const post = useMemberPost(scope, spaceId, postId);
  const like = usePostLike(scope);
  const memberName = useAuthStore.use.user()?.name ?? null;
  const comments = usePostComments(scope, postId);
  const addComment = useAddComment(scope, memberName);
  const deleteComment = useDeleteComment(scope);
  const [reportTarget, setReportTarget] = React.useState<ReportTarget | null>(null);

  const reportPost = React.useCallback(() => {
    if (!post.data) {
      return;
    }
    setReportTarget({
      surface: 'post',
      postId: post.data.id,
      spaceId: post.data.spaceId ?? undefined,
      excerpt: reportExcerpt(post.data.bodyText ?? post.data.title),
      authorName: post.data.authorName ?? undefined,
    });
  }, [post.data]);

  const reportComment = React.useCallback((commentPostId: string, comment: PostComment) => {
    setReportTarget({
      surface: 'comment',
      postId: commentPostId,
      commentId: comment.id,
      spaceId: post.data?.spaceId ?? undefined,
      excerpt: reportExcerpt(comment.bodyText),
      authorName: comment.authorName ?? undefined,
    });
  }, [post.data?.spaceId]);

  const postData = post.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MemberPostView
        post={post.data}
        contentState={post.contentState}
        isLoading={post.isLoading}
        onOpenUrl={url => void Linking.openURL(url)}
        onRetry={() => void post.refetch()}
        onRefresh={() => Promise.all([post.refetch(), comments.refetch()])}
        onRetryComments={() => void comments.refetch()}
        onBack={() => router.back()}
        headerRight={postData
          ? (
              <PostOverflowMenu
                scope={scope}
                postId={postData.id}
                spaceId={postData.spaceId}
                isOwn={postData.isOwn ?? false}
                onReportPost={reportPost}
                onDeleted={() => router.back()}
              />
            )
          : undefined}
        onToggleLike={(likedPostId, liked) => like.toggleLike({ postId: likedPostId, liked })}
        likePending={like.isPending}
        comments={comments.data?.comments}
        commentsTotal={comments.data?.totalCount}
        commentsUnavailable={comments.isError}
        onSubmitComment={(commentPostId, body) => addComment.addComment({ postId: commentPostId, body })}
        commentSubmitting={addComment.isPending}
        commentError={addComment.lastError}
        onDeleteComment={(commentPostId, commentId) =>
          deleteComment.deleteComment({ postId: commentPostId, commentId })}
        pendingDeleteCommentId={deleteComment.pendingCommentId}
        onLongPressComment={reportComment}
      />
      <ReportSheet scope={scope} target={reportTarget} onClose={() => setReportTarget(null)} />
    </>
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
