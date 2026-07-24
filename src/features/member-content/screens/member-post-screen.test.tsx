import type { MemberPostDetail } from '@/features/member-content/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { MemberPostView } from '@/features/member-content/screens/member-post-screen';

jest.mock('@/components/ui', () => ({
  Image: 'Image',
}));

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

const POST: MemberPostDetail = {
  id: 'post-1',
  spaceId: 'space-1',
  title: 'Laska morning update',
  bodyHtml: null,
  bodyText: 'Plain text fallback',
  imageUrl: null,
  tiptapDoc: {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Native rich content' }],
    }],
  },
  embeds: {},
  inlineAttachments: [],
  authorName: 'Rionna Racing',
  authorAvatarUrl: 'https://images.example/author.jpg',
  spaceName: 'Laska',
  createdAt: '2026-07-13T08:00:00.000Z',
  commentCount: 2,
  likeCount: 5,
  isLiked: false,
  url: null,
};

describe('memberPostView', () => {
  it('renders hydrated TipTap content natively with read-only counts', () => {
    render(<MemberPostView post={POST} contentState="fresh" />);

    expect(screen.getByText('Native rich content')).toBeOnTheScreen();
    expect(screen.queryByText('Plain text fallback')).not.toBeOnTheScreen();
    expect(screen.getByText('5 likes')).toBeOnTheScreen();
    expect(screen.getByText('2 comments')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rionna Racing avatar')).toBeOnTheScreen();
  });

  it('falls back to body text when the TipTap document is unusable', () => {
    render(
      <MemberPostView
        post={{ ...POST, tiptapDoc: null, bodyText: 'Readable saved update' }}
        contentState="saved"
      />,
    );

    expect(screen.getByText('Showing saved content')).toBeOnTheScreen();
    expect(screen.getByText('Readable saved update')).toBeOnTheScreen();
  });

  it('renders a retry action when the post is unavailable', () => {
    const onRetry = jest.fn();
    render(
      <MemberPostView
        post={undefined}
        contentState="unavailable"
        onRetry={onRetry}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Retry post' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('likes the post from the heart control', () => {
    const onToggleLike = jest.fn();
    render(<MemberPostView post={POST} contentState="fresh" onToggleLike={onToggleLike} />);

    fireEvent.press(screen.getByLabelText('Like post'));
    expect(onToggleLike).toHaveBeenCalledWith('post-1', true);
  });

  it('unlikes a liked post and disables the heart while in flight', () => {
    const onToggleLike = jest.fn();
    render(
      <MemberPostView
        post={{ ...POST, isLiked: true }}
        contentState="fresh"
        onToggleLike={onToggleLike}
        likePending
      />,
    );

    fireEvent.press(screen.getByLabelText('Unlike post'));
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it('keeps the like count read-only when no handler is wired', () => {
    render(<MemberPostView post={POST} contentState="fresh" />);
    expect(screen.queryByLabelText('Like post')).not.toBeOnTheScreen();
    expect(screen.getByText('5 likes')).toBeOnTheScreen();
  });

  it('renders the loading state', () => {
    render(
      <MemberPostView
        post={undefined}
        contentState="unavailable"
        isLoading={true}
      />,
    );
    expect(screen.getByTestId('member-post-loading')).toBeOnTheScreen();
  });
});
