import type { AuthUser } from '@/lib/auth/utils';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { CommunityFeedView } from '@/features/member-content/screens/community-feed-screen';

jest.mock('@/components/ui', () => ({
  Image: 'Image',
}));

jest.mock('@/components/ui/screen-layout', () => ({
  useScreenTopPadding: () => 70,
}));

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

const MEMBER: AuthUser = {
  id: 'member-1',
  email: 'jane@example.com',
  name: 'Jane Member',
};

const ITEM = {
  id: 'post-1',
  spaceId: 'space-1',
  kind: 'post' as const,
  title: 'Laska morning update',
  excerpt: 'A steady piece of work on the gallops.',
  createdAt: '2026-07-13T08:00:00.000Z',
  spaceName: 'Laska',
  authorName: 'Rionna Racing',
  commentCount: 2,
  likeCount: 5,
  imageUrl: null,
  url: null,
};

const BASE_PROPS = {
  member: MEMBER,
  items: [ITEM],
  contentState: 'fresh' as const,
  isLoading: false,
  isRefetching: false,
  onRefresh: jest.fn(),
  onOpenPost: jest.fn(),
  onOpenProfile: jest.fn(),
};

describe('communityFeedView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the live member feed and opens a native post', () => {
    render(<CommunityFeedView {...BASE_PROPS} />);

    expect(screen.getByText('Laska morning update')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Laska morning update' }));
    expect(BASE_PROPS.onOpenPost).toHaveBeenCalledWith('space-1', 'post-1');
  });

  it('labels cached content without hiding the saved feed', () => {
    render(<CommunityFeedView {...BASE_PROPS} contentState="saved" />);

    expect(screen.getByText('Showing saved content')).toBeOnTheScreen();
    expect(screen.getByText('Laska morning update')).toBeOnTheScreen();
  });

  it.each([
    ['loading', { ...BASE_PROPS, items: undefined, isLoading: true }],
    ['empty', { ...BASE_PROPS, items: [], contentState: 'empty' as const }],
    ['unavailable', { ...BASE_PROPS, items: undefined, contentState: 'unavailable' as const }],
  ])('renders the %s state', (_name, props) => {
    render(<CommunityFeedView {...props} />);
    expect(screen.getByTestId(`member-feed-${_name}`)).toBeOnTheScreen();
  });

  it('opens the profile from the avatar', () => {
    render(<CommunityFeedView {...BASE_PROPS} />);

    fireEvent.press(screen.getByRole('button', { name: 'Open profile' }));
    expect(BASE_PROPS.onOpenProfile).toHaveBeenCalledTimes(1);
  });
});
