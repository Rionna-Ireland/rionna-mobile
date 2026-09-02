import type { MemberFeedItem } from '@/features/member-content/types';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { FeedItemRenderer } from '@/features/member-content/components/feed-item-renderer';

const base: MemberFeedItem = {
  id: 'post-1',
  spaceId: 'sp1',
  kind: 'post',
  title: 'Yard news',
  excerpt: null,
  createdAt: null,
  spaceName: 'Racing',
  authorName: 'Emma',
  commentCount: 0,
  likeCount: 0,
  isLiked: false,
  imageUrl: null,
  url: null,
};

const props = { onOpen: jest.fn(), onToggleLike: jest.fn(), likePending: false, onVote: jest.fn(), votePending: false };

describe('feedItemRenderer', () => {
  it('renders posts with MemberFeedCard', () => {
    render(<FeedItemRenderer item={base} {...props} />);
    expect(screen.getByText('Yard news')).toBeOnTheScreen();
  });

  it('renders kind:poll items with PollCard and forwards votes', () => {
    const item: MemberFeedItem = {
      ...base,
      id: 'poll:p1',
      kind: 'poll',
      title: 'Which charity?',
      poll: {
        id: 'p1',
        question: 'Which charity?',
        scope: 'club',
        circleSpaceId: null,
        status: 'open',
        publishedAt: '2026-09-01T09:00:00.000Z',
        closesAt: null,
        options: [{ id: 'o1', label: 'A', sortOrder: 0 }, { id: 'o2', label: 'B', sortOrder: 1 }],
        myVoteOptionId: null,
        results: null,
      },
    };
    render(<FeedItemRenderer item={item} {...props} />);
    fireEvent.press(screen.getByTestId('poll-option-o2'));
    expect(props.onVote).toHaveBeenCalledWith('p1', 'o2');
  });
});
