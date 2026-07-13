import type { MemberFeedItem } from '@/features/member-content/types';

import * as React from 'react';
import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { MemberFeedCard } from './member-feed-card';

afterEach(cleanup);

const item: MemberFeedItem = {
  id: 'post-42',
  spaceId: 'space-7',
  kind: 'post',
  title: 'Morning from the yard',
  excerpt: 'The horses have finished first lot.',
  createdAt: '2026-07-13T08:30:00.000Z',
  spaceName: 'Stable Updates',
  authorName: 'Jane Trainer',
  commentCount: 4,
  likeCount: 9,
  imageUrl: null,
  url: null,
};

describe('memberFeedCard', () => {
  it('shows the post and read-only community activity', () => {
    render(<MemberFeedCard item={item} onOpen={jest.fn()} />);

    expect(screen.getByText('Morning from the yard')).toBeOnTheScreen();
    expect(screen.getByText('The horses have finished first lot.')).toBeOnTheScreen();
    expect(screen.getByText('Jane Trainer')).toBeOnTheScreen();
    expect(screen.getByText('9 likes')).toBeOnTheScreen();
    expect(screen.getByText('4 comments')).toBeOnTheScreen();
  });

  it('opens a post with the Circle space and post ids', async () => {
    const onOpen = jest.fn();
    const { user } = setup(<MemberFeedCard item={item} onOpen={onOpen} />);

    await user.press(screen.getByRole('button', { name: /morning from the yard/i }));
    expect(onOpen).toHaveBeenCalledWith('space-7', 'post-42');
  });

  it('keeps a post without a Circle space visible but non-interactive', () => {
    const onOpen = jest.fn();
    render(<MemberFeedCard item={{ ...item, spaceId: null }} onOpen={onOpen} />);
    expect(screen.queryByRole('button', { name: /morning from the yard/i })).toBeNull();
    expect(screen.getByText('Morning from the yard')).toBeOnTheScreen();
  });
});
