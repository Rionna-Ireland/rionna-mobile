import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { ProfileScreen } from '@/features/settings/screens/profile-screen';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSignOut = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: mockNavigate, back: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 0 }));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

jest.mock('@/features/auth/use-auth-store', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useAuthStore: {
    use: {
      user: () => ({ id: 'member-1', email: 'jane@example.com', name: 'Jane Member' }),
    },
  },
}));

const mockMembership = jest.fn();
jest.mock('@/features/settings/api/use-membership', () => ({
  useMembership: () => mockMembership(),
}));

const ACTIVE = { since: '2026-03-12T12:00:00.000Z', foundingMember: false, status: 'active' };

describe('profileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembership.mockReturnValue({ data: ACTIVE });
  });

  it('shows the member identity with the membership line and log out', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('Jane Member')).toBeOnTheScreen();
    expect(screen.getByText('Member since March 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sign-out-button'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('carries zero billing surfaces (D9)', () => {
    render(<ProfileScreen />);

    expect(screen.queryByText(/renew/i)).toBeNull();
    expect(screen.queryByText(/billing/i)).toBeNull();
    expect(screen.queryByText(/subscription/i)).toBeNull();
    expect(screen.queryByText(/payment/i)).toBeNull();
    expect(screen.getByText('Active')).toBeOnTheScreen();
  });

  it('shows the founding member line', () => {
    mockMembership.mockReturnValue({ data: { ...ACTIVE, foundingMember: true } });
    render(<ProfileScreen />);
    expect(screen.getByText('Founding member, since March 2026')).toBeOnTheScreen();
  });

  it('falls back to the email while membership is loading or has no start date', () => {
    mockMembership.mockReturnValue({ data: undefined });
    const { rerender } = render(<ProfileScreen />);
    expect(screen.getByText('jane@example.com')).toBeOnTheScreen();
    expect(screen.queryByTestId('membership-status')).toBeNull();
    mockMembership.mockReturnValue({ data: { ...ACTIVE, since: null } });
    rerender(<ProfileScreen />);
    expect(screen.getByText('jane@example.com')).toBeOnTheScreen();
  });

  it.each([
    ['past_due', 'Past due'],
    ['cancelled', 'Ended'],
    ['none', 'Not a member'],
  ])('shows the %s status pill without billing words', (status, label) => {
    mockMembership.mockReturnValue({ data: { ...ACTIVE, status } });
    render(<ProfileScreen />);
    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.queryByText(/renew|billing|subscription|payment/i)).toBeNull();
  });

  it('has no Notifications row (the Home bell owns it)', () => {
    render(<ProfileScreen />);

    expect(screen.queryByText(/^notifications$/i)).toBeNull();
    expect(screen.getByText('Notification preferences')).toBeOnTheScreen();
  });

  it('routes the settings rows', () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('row-personal-details'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/personal-details');
    fireEvent.press(screen.getByTestId('profile-edit'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/personal-details');
    fireEvent.press(screen.getByTestId('row-notification-preferences'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/notifications');
    fireEvent.press(screen.getByTestId('row-followed-horses'));
    expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/stables', params: { filter: 'following' } });
    fireEvent.press(screen.getByTestId('row-change-password'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/change-password');
    fireEvent.press(screen.getByTestId('row-delete-account'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings/delete-account');
  });
});
