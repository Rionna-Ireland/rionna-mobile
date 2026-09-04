import type { AuthUser } from '@/lib/auth/utils';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { ComposePostScreen } from '@/features/community-posting/screens/compose-post-screen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { spaceId?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('env', () => ({
  __esModule: true,
  default: { EXPO_PUBLIC_CLUB_ID: 'org-1' },
}));

const MEMBER: AuthUser = { id: 'member-1', email: 'jane@example.com', name: 'Jane Member' };
const mockUseAuthStoreUser = jest.fn(() => MEMBER);

jest.mock('@/features/auth/use-auth-store', () => ({
  useAuthStore: { use: { user: () => mockUseAuthStoreUser() } },
}));

const SPACES = [
  { id: 'space-1', name: 'Laska', emoji: '🐎', isHorse: true },
  { id: 'space-2', name: 'Club News', emoji: null, isHorse: false },
];

const mockRefetch = jest.fn();
const mockUsePostableSpaces = jest.fn(() => ({
  data: { ok: true, spaces: SPACES },
  refetch: mockRefetch,
}));

jest.mock('@/features/community-posting/api/use-postable-spaces', () => ({
  usePostableSpaces: () => mockUsePostableSpaces(),
}));

let mockFailure: string | null = null;
const mockCreate = jest.fn();
const mockUseCreatePost = jest.fn(() => ({ create: mockCreate, isPending: false, failure: mockFailure }));

jest.mock('@/features/community-posting/api/use-create-post', () => ({
  useCreatePost: () => mockUseCreatePost(),
}));

jest.mock('@/features/community-posting/lib/pick-image', () => ({
  pickImage: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.Image, Pressable: RN.Pressable, Text: RN.Text, View: RN.View };
});

jest.mock('@/components/ui/modal', () => {
  const RN = jest.requireActual('react-native');
  return {
    Modal: ({ children }: { children: React.ReactNode }) => <RN.View>{children}</RN.View>,
    useModal: () => ({ ref: { current: null }, present: jest.fn(), dismiss: jest.fn() }),
  };
});

function typeEnoughBody() {
  fireEvent.changeText(screen.getByLabelText('Post body'), 'Ten characters plus');
}

describe('composePostScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockFailure = null;
    mockUseAuthStoreUser.mockReturnValue(MEMBER);
    mockUsePostableSpaces.mockReturnValue({ data: { ok: true, spaces: SPACES }, refetch: mockRefetch });
    mockUseCreatePost.mockReturnValue({ create: mockCreate, isPending: false, failure: mockFailure });
  });

  it('disables Post until the title is set or the body has at least 10 characters', () => {
    render(<ComposePostScreen />);
    const submit = screen.getByTestId('compose-post-submit');
    expect(submit.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

    fireEvent.changeText(screen.getByLabelText('Post body'), 'short');
    expect(screen.getByTestId('compose-post-submit').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    typeEnoughBody();
    expect(screen.getByTestId('compose-post-submit').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('enables Post once a title is entered even with a short body', () => {
    render(<ComposePostScreen />);
    fireEvent.changeText(screen.getByLabelText('Post title'), 'A title');
    expect(screen.getByTestId('compose-post-submit').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('shows the blocked failure copy and keeps the typed text', async () => {
    mockFailure = 'blocked';
    mockUseCreatePost.mockReturnValue({ create: mockCreate, isPending: false, failure: 'blocked' });
    mockCreate.mockResolvedValue({ ok: false, reason: 'blocked' });

    render(<ComposePostScreen />);
    typeEnoughBody();
    fireEvent.press(screen.getByTestId('compose-post-submit'));
    await screen.findByText('That post can\'t be published.');

    expect(screen.getByLabelText('Post body').props.value).toBe('Ten characters plus');
  });

  it('shows the rate-limited failure copy', async () => {
    mockUseCreatePost.mockReturnValue({ create: mockCreate, isPending: false, failure: 'rate_limited' });
    render(<ComposePostScreen />);
    expect(
      await screen.findByText('You\'ve posted a lot today — try again later.'),
    ).toBeOnTheScreen();
  });

  it('shows the not_allowed copy and refetches postable spaces', () => {
    mockUseCreatePost.mockReturnValue({ create: mockCreate, isPending: false, failure: 'not_allowed' });
    render(<ComposePostScreen />);
    expect(screen.getByText('You can\'t post in that space.')).toBeOnTheScreen();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows the image_failed failure copy', () => {
    mockUseCreatePost.mockReturnValue({ create: mockCreate, isPending: false, failure: 'image_failed' });
    render(<ComposePostScreen />);
    expect(screen.getByText('That photo couldn\'t be uploaded.')).toBeOnTheScreen();
  });

  it.each(['network', 'circle_failed'])('shows the generic retry copy for %s', (failure) => {
    mockUseCreatePost.mockReturnValue({ create: mockCreate, isPending: false, failure });
    render(<ComposePostScreen />);
    expect(screen.getByText('Couldn\'t publish right now. Try again.')).toBeOnTheScreen();
  });

  it('navigates to the new post on success', async () => {
    mockCreate.mockResolvedValue({ ok: true, post: { circlePostId: 'post-9', spaceId: 'space-1' } });
    render(<ComposePostScreen />);
    typeEnoughBody();
    fireEvent.press(screen.getByTestId('compose-post-submit'));

    await screen.findByTestId('compose-post-submit');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      spaceId: 'space-1',
      body: 'Ten characters plus',
    }));
    expect(mockReplace).toHaveBeenCalledWith('/post/space-1/post-9');
  });

  it('preselects the space passed as a search param', () => {
    mockParams = { spaceId: 'space-2' };
    render(<ComposePostScreen />);
    expect(screen.getByTestId('compose-post-space-trigger')).toHaveTextContent(/Club News/);
  });
});
