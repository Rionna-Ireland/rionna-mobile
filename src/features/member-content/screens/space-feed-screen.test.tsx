import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { SpaceFeedView } from '@/features/member-content/screens/space-feed-screen';

jest.mock('@/components/ui', () => ({
  Image: 'Image',
}));

const ITEM = {
  id: 'post-9',
  spaceId: 'space-9',
  kind: 'post' as const,
  title: 'Laska schooling session',
  excerpt: 'Jumped a full course this morning.',
  createdAt: '2026-07-23T08:00:00.000Z',
  spaceName: 'Laska',
  authorName: 'Rionna Racing',
  commentCount: 3,
  likeCount: 7,
  isLiked: false,
  imageUrl: null,
  url: null,
};

const BASE_PROPS = {
  title: 'Laska du Breuil',
  items: [ITEM],
  contentState: 'fresh' as const,
  isLoading: false,
  isRefetching: false,
  onRefresh: jest.fn(),
  onOpenPost: jest.fn(),
};

describe('spaceFeedView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the horse title and its posts, and opens a post natively', () => {
    render(<SpaceFeedView {...BASE_PROPS} />);

    expect(screen.getByText('Laska du Breuil')).toBeOnTheScreen();
    expect(screen.getByText('Laska schooling session')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Laska schooling session' }));
    expect(BASE_PROPS.onOpenPost).toHaveBeenCalledWith('space-9', 'post-9');
  });

  it.each([
    ['loading', { ...BASE_PROPS, items: undefined, isLoading: true }],
    ['empty', { ...BASE_PROPS, items: [], contentState: 'empty' as const }],
    ['unavailable', { ...BASE_PROPS, items: undefined, contentState: 'unavailable' as const }],
  ])('renders the %s state', (_name, props) => {
    render(<SpaceFeedView {...props} />);
    expect(screen.getByTestId(`space-feed-${_name}`)).toBeOnTheScreen();
  });
});
