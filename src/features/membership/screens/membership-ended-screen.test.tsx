import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { signOut } from '@/features/auth/use-auth-store';
import { onMembershipEndedClosed } from '@/features/membership/lib/membership-ended';

import { MembershipEndedScreen } from './membership-ended-screen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));
jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 0 }));
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});
jest.mock('@/features/auth/use-auth-store', () => ({ signOut: jest.fn() }));
jest.mock('@/features/membership/lib/membership-ended', () => ({ onMembershipEndedClosed: jest.fn() }));

describe('membershipEndedScreen', () => {
  it('keeps profile and sign-out reachable, and re-arms on close', () => {
    const { unmount } = render(<MembershipEndedScreen />);
    expect(screen.getByText('Your membership has ended')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('membership-ended-action'));
    expect(mockPush).toHaveBeenCalledWith('/profile');

    fireEvent.press(screen.getByTestId('membership-ended-sign-out'));
    expect(signOut).toHaveBeenCalled();

    expect(onMembershipEndedClosed).not.toHaveBeenCalled();
    unmount();
    expect(onMembershipEndedClosed).toHaveBeenCalled();
  });
});
