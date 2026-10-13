import type { PostComment } from '@/features/member-content/types';

import * as React from 'react';
import { Alert, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
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
import { fadeUpEntering, listLayout, reducedFadeEntering, useMotion } from '@/lib/motion';

export type CommentHandlers = {
  /** Wire to enable delete on the member's own comments (asks to confirm first). */
  onDeleteComment?: (postId: string, commentId: string) => void;
  /** Dims the comment being deleted. */
  pendingDeleteCommentId?: string | null;
  /** Wire to open the report sheet for a long-pressed comment. */
  onLongPressComment?: (postId: string, comment: PostComment) => void;
  /** S13-19: wire (only for canPin viewers) to offer "Pin as expert answer". */
  onPinComment?: (postId: string, commentId: string) => void;
  /** S13-19: wire (only for canPin viewers) to offer "Unpin" on the pinned card. */
  onUnpinAnswer?: (postId: string) => void;
};

type CommentRowProps = CommentHandlers & { postId: string; comment: PostComment; isReply?: boolean };

/**
 * One comment card. To a screen reader it's a single element that reads the
 * author, time and text, with Delete and Report as custom actions (A-004);
 * sighted members long-press it to report and tap Delete (confirmed, A-017).
 */
function CommentRow({ postId, comment, onDeleteComment, pendingDeleteCommentId, onLongPressComment, onPinComment, onUnpinAnswer, isReply = false }: CommentRowProps) {
  const authorName = authorDisplayName(comment.authorName);
  const time = formatRelativeTime(comment.createdAt);
  const deleting = pendingDeleteCommentId === comment.id;
  // A staff/trainer answer is highlighted lilac (frame 11).
  const highlighted = Boolean(comment.authorRole);
  const canDelete = Boolean(comment.canDelete && onDeleteComment);
  const requestDelete = () => confirmDeleteComment(() => onDeleteComment?.(postId, comment.id));
  const report = onLongPressComment ? () => onLongPressComment(postId, comment) : undefined;
  const pin = onPinComment ? () => onPinComment(postId, comment.id) : undefined;
  // Pinners get a small sheet (Pin / Report); everyone else long-presses straight to Report.
  const openMenu = pin
    ? () =>
        Alert.alert(translate('community.comment.actionsTitle'), undefined, [
          { text: translate('community.comment.pinAction'), onPress: pin },
          ...(report ? [{ text: translate('community.comment.reportAction'), onPress: report }] : []),
          { text: translate('community.comment.deleteCancel'), style: 'cancel' as const },
        ])
    : report;
  const a11y = a11yCardProps({
    label: a11ySummary([authorName, comment.authorRoleLabel ?? comment.authorRole, time, comment.bodyText]),
    actions: [
      pin && !deleting && { name: 'pin', label: translate('community.comment.pinAction'), onAction: pin },
      canDelete && !deleting && { name: 'delete', label: translate('community.comment.deleteAction'), onAction: requestDelete },
      report && { name: 'report', label: translate('community.comment.reportAction'), onAction: report },
    ],
  });
  const card = (
    <Card
      variant="white"
      className={twMerge(highlighted ? 'gap-3 border border-outline-variant bg-primary-fixed' : 'gap-3', deleting && 'opacity-40')}
    >
      <AuthorHeader name={authorName} avatarUrl={comment.authorAvatarUrl} time={time} role={comment.authorRole} roleLabelText={comment.authorRoleLabel} showSpaceTag={false} />
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
      {openMenu
        ? <MotionPressable testID={`comment-${comment.id}`} {...a11y} onLongPress={openMenu}>{card}</MotionPressable>
        : <View testID={`comment-${comment.id}`} {...a11y}>{card}</View>}
      {comment.replies.map(reply => (
        <CommentRow
          key={reply.id}
          postId={postId}
          comment={reply}
          onDeleteComment={onDeleteComment}
          pendingDeleteCommentId={pendingDeleteCommentId}
          onLongPressComment={onLongPressComment}
          onPinComment={onPinComment}
          onUnpinAnswer={onUnpinAnswer}
          isReply
        />
      ))}
    </View>
  );
}

/**
 * The pinned expert answer (frame 11): lilac card under the post, name line
 * "{name}, {role}", white PINNED EXPERT ANSWER tag. Replies to it stay nested.
 */
function PinnedAnswerCard({ postId, comment, ...handlers }: CommentHandlers & { postId: string; comment: PostComment }) {
  const { reduceMotion } = useMotion();
  const { onLongPressComment, onUnpinAnswer } = handlers;
  const role = comment.authorRoleLabel ?? comment.authorRole;
  const authorName = authorDisplayName(comment.authorName);
  const nameLine = role ? `${authorName}, ${role}` : authorName;
  const unpin = onUnpinAnswer ? () => onUnpinAnswer(postId) : undefined;
  const report = onLongPressComment ? () => onLongPressComment(postId, comment) : undefined;
  const openMenu = unpin
    ? () =>
        Alert.alert(translate('community.comment.actionsTitle'), undefined, [
          { text: translate('community.comment.unpinAction'), onPress: unpin },
          ...(report ? [{ text: translate('community.comment.reportAction'), onPress: report }] : []),
          { text: translate('community.comment.deleteCancel'), style: 'cancel' as const },
        ])
    : report;
  const a11y = a11yCardProps({
    label: `${translate('community.pinned.a11y', { name: nameLine })}: ${comment.bodyText ?? ''}`,
    actions: [
      unpin && { name: 'unpin', label: translate('community.comment.unpinAction'), onAction: unpin },
      report && { name: 'report', label: translate('community.comment.reportAction'), onAction: report },
    ],
  });
  const card = (
    <Card variant="white" className="gap-3 border border-outline-variant bg-primary-fixed">
      <AuthorHeader
        name={nameLine}
        avatarUrl={comment.authorAvatarUrl}
        time={formatRelativeTime(comment.createdAt)}
        tag={translate('community.pinned.tag')}
        showSpaceTag={false}
      />
      {comment.bodyText ? <Text variant="body-lg" className="text-ink">{comment.bodyText}</Text> : null}
    </Card>
  );
  return (
    <Animated.View
      testID="pinned-answer-card"
      className="mt-3 gap-3"
      entering={reduceMotion ? reducedFadeEntering() : fadeUpEntering(0)}
    >
      {openMenu
        ? <MotionPressable testID="pinned-answer-press" {...a11y} onLongPress={openMenu}>{card}</MotionPressable>
        : <View {...a11y}>{card}</View>}
      {comment.replies.map(reply => (
        <CommentRow key={reply.id} postId={postId} comment={reply} {...handlers} isReply />
      ))}
    </Animated.View>
  );
}

type CommentsSectionProps = CommentHandlers & {
  postId: string;
  comments?: PostComment[];
  /** S13-19: shown as a lilac card above the replies; never also in `comments`. */
  pinnedAnswer?: PostComment | null;
  total: number;
  commentsUnavailable?: boolean;
  /** Reloads the comments (the failed state's Try again). */
  onRetryComments?: () => void;
};

export function CommentsSection({ postId, comments, pinnedAnswer = null, total, commentsUnavailable = false, onRetryComments, ...handlers }: CommentsSectionProps) {
  const { reduceMotion } = useMotion();
  // The server total counts the pinned comment; the list below doesn't.
  const replies = pinnedAnswer ? Math.max(0, total - 1) : total;
  return (
    <View className="mt-4 gap-3">
      {pinnedAnswer ? <PinnedAnswerCard postId={postId} comment={pinnedAnswer} {...handlers} /> : null}
      <MonoLabel>{translate('community.comment.repliesLabel', { count: replies })}</MonoLabel>
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
      {comments?.map(comment => (
        <Animated.View key={comment.id} layout={listLayout(reduceMotion)}>
          <CommentRow postId={postId} comment={comment} {...handlers} />
        </Animated.View>
      ))}
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
