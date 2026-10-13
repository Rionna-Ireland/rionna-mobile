import type { PostComment } from '@/features/member-content/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Alert } from 'react-native';

import { CommentsSection } from '@/features/member-content/components/thread-comments';

jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 0, useScreenBottomPadding: () => 0 }));

function c(id: string, over: Partial<PostComment> = {}): PostComment {
  return { id, parentCommentId: null, bodyText: `body ${id}`, tiptapDoc: null, authorName: `Author ${id}`, authorAvatarUrl: null, createdAt: '2026-07-01T00:00:00Z', likeCount: 0, isLiked: false, canDelete: false, replies: [], ...over };
}
const PINNED = c('p', { authorName: 'Ger Byrne', authorRole: 'trainer', bodyText: 'An entry is a maybe.' });

describe('pinned answer card', () => {
  it('renders the card with name line, tag, a11y label; replies label excludes the pin', () => {
    render(<CommentsSection postId="post" pinnedAnswer={PINNED} comments={[c('a')]} total={2} />);
    expect(screen.getByTestId('pinned-answer-card')).toBeOnTheScreen();
    expect(screen.getByText('Ger Byrne, trainer')).toBeOnTheScreen();
    expect(screen.getByText('Pinned expert answer')).toBeOnTheScreen();
    expect(screen.getByText('Replies (1)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pinned expert answer from Ger Byrne, trainer: An entry is a maybe.')).toBeOnTheScreen();
  });

  it('uses the expert label in the name line', () => {
    render(<CommentsSection postId="post" pinnedAnswer={c('p', { authorName: 'Aoife', authorRole: 'expert', authorRoleLabel: 'vet' })} comments={[]} total={1} />);
    expect(screen.getByText('Aoife, vet')).toBeOnTheScreen();
  });

  it('shows no card without a pin and keeps the full total', () => {
    render(<CommentsSection postId="post" comments={[c('a')]} total={1} />);
    expect(screen.queryByTestId('pinned-answer-card')).toBeNull();
    expect(screen.getByText('Replies (1)')).toBeOnTheScreen();
  });

  it('long-press on a comment offers Pin only when onPinComment is wired', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onPin = jest.fn();
    render(<CommentsSection postId="post" comments={[c('a')]} total={1} onLongPressComment={jest.fn()} onPinComment={onPin} />);
    fireEvent(screen.getByTestId('comment-a'), 'longPress');
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    expect(buttons.map(b => b.text)).toContain('Pin as expert answer');
    buttons.find(b => b.text === 'Pin as expert answer')?.onPress?.();
    expect(onPin).toHaveBeenCalledWith('post', 'a');
    alert.mockRestore();
  });

  it('exposes pin and unpin as accessibility actions', () => {
    const onPin = jest.fn();
    const onUnpin = jest.fn();
    render(<CommentsSection postId="post" pinnedAnswer={PINNED} comments={[c('a')]} total={2} onPinComment={onPin} onUnpinAnswer={onUnpin} onLongPressComment={jest.fn()} />);
    const pinned = screen.getByTestId('pinned-answer-press');
    fireEvent(pinned, 'accessibilityAction', { nativeEvent: { actionName: 'unpin' } });
    expect(onUnpin).toHaveBeenCalledWith('post');
    fireEvent(screen.getByTestId('comment-a'), 'accessibilityAction', { nativeEvent: { actionName: 'pin' } });
    expect(onPin).toHaveBeenCalledWith('post', 'a');
  });
});
