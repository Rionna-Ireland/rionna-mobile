import type { MemberContentScope } from '@/features/member-content/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { NewPostButton } from '@/features/community-posting/components/new-post-button';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

const mockUsePostableSpaces = jest.fn();

jest.mock('@/features/community-posting/api/use-postable-spaces', () => ({
  usePostableSpaces: (scope: MemberContentScope) => mockUsePostableSpaces(scope),
}));

const SCOPE: MemberContentScope = { organizationId: 'org-1', memberId: 'member-1' };

describe('newPostButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is hidden when there are no postable spaces', () => {
    mockUsePostableSpaces.mockReturnValue({ data: { ok: true, spaces: [] }, isError: false });
    render(<NewPostButton scope={SCOPE} />);
    expect(screen.queryByTestId('new-post-button')).not.toBeOnTheScreen();
  });

  it('is hidden when the postable spaces query errored', () => {
    mockUsePostableSpaces.mockReturnValue({ data: undefined, isError: true });
    render(<NewPostButton scope={SCOPE} />);
    expect(screen.queryByTestId('new-post-button')).not.toBeOnTheScreen();
  });

  it('is visible when at least one space is postable and pushes the composer', () => {
    mockUsePostableSpaces.mockReturnValue({
      data: { ok: true, spaces: [{ id: 'space-1', name: 'Laska', emoji: null, isHorse: true }] },
      isError: false,
    });
    render(<NewPostButton scope={SCOPE} />);

    const button = screen.getByTestId('new-post-button');
    expect(button).toBeOnTheScreen();
    fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledWith('/post/new');
  });

  it('preselects the first postable space of the selected feed chip', () => {
    mockUsePostableSpaces.mockReturnValue({
      data: { ok: true, spaces: [{ id: 'space-1', name: 'Laska', emoji: null, isHorse: true }] },
      isError: false,
    });
    render(<NewPostButton scope={SCOPE} spaceIds={['space-9', 'space-1']} />);
    fireEvent.press(screen.getByTestId('new-post-button'));
    expect(mockPush).toHaveBeenCalledWith('/post/new?spaceId=space-1');
  });

  it('falls back to the default when the selected chip has no postable space', () => {
    mockUsePostableSpaces.mockReturnValue({
      data: { ok: true, spaces: [{ id: 'space-1', name: 'Laska', emoji: null, isHorse: true }] },
      isError: false,
    });
    render(<NewPostButton scope={SCOPE} spaceIds={['space-9']} />);
    fireEvent.press(screen.getByTestId('new-post-button'));
    expect(mockPush).toHaveBeenCalledWith('/post/new');
  });
});
