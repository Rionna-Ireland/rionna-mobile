import type { PostComment } from '@/features/member-content/types';

import * as React from 'react';
import { TextInput, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { twMerge } from 'tailwind-merge';

import { Button, Card, IconButton, MonoLabel, MotionPressable, Text } from '@/components/ui';
import { a11yCardProps, a11ySummary } from '@/components/ui/a11y-card';
import colors from '@/components/ui/colors';
import { useScreenBottomPadding } from '@/components/ui/screen-layout';
import { AuthorHeader } from '@/features/member-content/components/post-parts';
import { confirmDeleteComment } from '@/features/member-content/lib/confirm-delete-comment';
import { authorDisplayName } from '@/features/member-content/lib/post-labels';
import { formatRelativeTime } from '@/features/member-content/lib/space-tag';
import { translate } from '@/lib/i18n';

export type CommentHandlers = {
  /** Wire to enable delete on the member's own comments (asks to confirm first). */
  onDeleteComment?: (postId: string, commentId: string) => void;
  /** Dims the comment being deleted. */
  pendingDeleteCommentId?: string | null;
  /** Wire to open the report sheet for a long-pressed comment. */
  onLongPressComment?: (postId: string, comment: PostComment) => void;
};

type CommentRowProps = CommentHandlers & { postId: string; comment: PostComment; isReply?: boolean };

/**
 * One comment card. To a screen reader it's a single element that reads the
 * author, time and text, with Delete and Report as custom actions (A-004);
 * sighted members long-press it to report and tap Delete (confirmed, A-017).
 */
function CommentRow({ postId, comment, onDeleteComment, pendingDeleteCommentId, onLongPressComment, isReply = false }: CommentRowProps) {
  const authorName = authorDisplayName(comment.authorName);
  const time = formatRelativeTime(comment.createdAt);
  const deleting = pendingDeleteCommentId === comment.id;
  // A staff/trainer answer is highlighted lilac (frame 11); hidden until S13-11 sends authorRole.
  const highlighted = Boolean(comment.authorRole);
  const canDelete = Boolean(comment.canDelete && onDeleteComment);
  const requestDelete = () => confirmDeleteComment(() => onDeleteComment?.(postId, comment.id));
  const report = onLongPressComment ? () => onLongPressComment(postId, comment) : undefined;
  const a11y = a11yCardProps({
    label: a11ySummary([authorName, time, comment.bodyText]),
    actions: [
      canDelete && !deleting && { name: 'delete', label: translate('community.comment.deleteAction'), onAction: requestDelete },
      report && { name: 'report', label: translate('community.comment.reportAction'), onAction: report },
    ],
  });
  const card = (
    <Card
      variant="white"
      className={twMerge(highlighted ? 'gap-3 border border-outline-variant bg-primary-fixed' : 'gap-3', deleting && 'opacity-40')}
    >
      <AuthorHeader name={authorName} avatarUrl={comment.authorAvatarUrl} time={time} role={comment.authorRole} showSpaceTag={false} />
      {comment.bodyText ? <Text variant="body-lg" className="text-ink-variant">{comment.bodyText}</Text> : null}
      {canDelete
        ? (
            <MotionPressable
              size="small"
              accessibilityRole="button"
              accessibilityLabel={translate('community.comment.deleteAction')}
              disabled={deleting}
              dimDisabled={false}
              hitSlop={8}
              className="self-start"
              onPress={requestDelete}
            >
              <Text variant="body-sm" className="text-ink-muted">{translate('community.comment.delete')}</Text>
            </MotionPressable>
          )
        : null}
    </Card>
  );
  return (
    <View className={isReply ? 'ml-6 gap-3' : 'gap-3'}>
      {report
        ? <MotionPressable testID={`comment-${comment.id}`} {...a11y} onLongPress={report}>{card}</MotionPressable>
        : <View testID={`comment-${comment.id}`} {...a11y}>{card}</View>}
      {comment.replies.map(reply => (
        <CommentRow
          key={reply.id}
          postId={postId}
          comment={reply}
          onDeleteComment={onDeleteComment}
          pendingDeleteCommentId={pendingDeleteCommentId}
          onLongPressComment={onLongPressComment}
          isReply
        />
      ))}
    </View>
  );
}

type CommentsSectionProps = CommentHandlers & {
  postId: string;
  comments?: PostComment[];
  total: number;
  commentsUnavailable?: boolean;
  /** Reloads the comments (the failed state's Try again). */
  onRetryComments?: () => void;
};

export function CommentsSection({ postId, comments, total, commentsUnavailable = false, onRetryComments, ...handlers }: CommentsSectionProps) {
  return (
    <View className="mt-4 gap-3">
      <MonoLabel>{translate('community.comment.repliesLabel', { count: total })}</MonoLabel>
      {commentsUnavailable
        ? (
            <View testID="post-comments-unavailable" className="items-start gap-3">
              <Text variant="body" className="text-ink-variant">{translate('community.comment.unavailable')}</Text>
              {onRetryComments
                ? (
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth={false}
                      label={translate('common.tryAgain')}
                      onPress={onRetryComments}
                    />
                  )
                : null}
            </View>
          )
        : null}
      {!commentsUnavailable && comments && comments.length === 0
        ? (
            <Card>
              <Text variant="title">{translate('community.comment.emptyTitle')}</Text>
              <Text variant="body-sm" className="mt-1 text-ink-muted">{translate('community.comment.emptyBody')}</Text>
            </Card>
          )
        : null}
      {comments?.map(comment => <CommentRow key={comment.id} postId={postId} comment={comment} {...handlers} />)}
    </View>
  );
}

function SendArrow() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M12 19V5M5.5 11.5L12 5l6.5 6.5"
        stroke={colors.plum}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

type CommentComposerProps = {
  postId: string;
  onSubmitComment: (postId: string, body: string) => void;
  commentSubmitting?: boolean;
  /** Set after a failed submit: either way the member's text comes back (A-016). */
  commentError?: 'blocked' | 'failed' | null;
};

/** Brings the last sent text back into an empty composer when a send fails or is held back. */
function useRestoreOnError(commentError: CommentComposerProps['commentError']) {
  const [text, setText] = React.useState('');
  const [lastSubmitted, setLastSubmitted] = React.useState('');
  const [seenError, setSeenError] = React.useState(commentError);
  if (commentError !== seenError) {
    setSeenError(commentError);
    if (commentError && lastSubmitted)
      setText(current => current || lastSubmitted);
  }
  return { text, setText, setLastSubmitted };
}

export function CommentComposer({ postId, onSubmitComment, commentSubmitting = false, commentError = null }: CommentComposerProps) {
  const { text, setText, setLastSubmitted } = useRestoreOnError(commentError);
  const bottomPadding = useScreenBottomPadding();
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed || commentSubmitting)
      return;
    setLastSubmitted(trimmed);
    onSubmitComment(postId, trimmed);
    setText('');
  };

  return (
    <View className="gap-2 bg-surface px-4 pt-2" style={{ paddingBottom: bottomPadding + 8 }}>
      {commentError
        ? (
            <Text variant="body-sm" className="text-plum" accessibilityLiveRegion="polite">
              {translate(commentError === 'blocked' ? 'community.composer.blocked' : 'community.composer.failed')}
            </Text>
          )
        : null}
      <View className="flex-row items-end gap-3 rounded-xl border border-outline-variant bg-white p-3">
        <TextInput
          accessibilityLabel={translate('community.composer.inputA11y')}
          placeholder={translate('community.composer.placeholder')}
          placeholderTextColor={colors.inkMuted}
          value={text}
          onChangeText={setText}
          editable={!commentSubmitting}
          multiline
          className="max-h-28 min-h-[46px] flex-1 font-sans-medium text-sm/5 text-ink"
          textAlignVertical="center"
        />
        <IconButton
          variant="square-accent"
          accessibilityLabel={translate('community.composer.sendA11y')}
          disabled={commentSubmitting || trimmed.length === 0}
          onPress={submit}
        >
          <SendArrow />
        </IconButton>
      </View>
    </View>
  );
}
