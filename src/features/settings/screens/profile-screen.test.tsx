import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { ProfileScreen } from '@/features/settings/screens/profile-screen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

jest.mock('@/features/auth/use-auth-store', () => ({
  signOut: jest.fn(),
  useAuthStore: {
    use: {
      user: () => ({ id: 'member-1', email: 'jane@example.com', name: 'Jane Member' }),
    },
  },
}));

describe('profileScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the member identity and sign out', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('Jane Member')).toBeOnTheScreen();
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getByTestId('sign-out-button')).toBeOnTheScreen();
  });

  it('carries zero billing surfaces (D9)', () => {
    render(<ProfileScreen />);

    expect(screen.queryByText(/renew/i)).toBeNull();
    expect(screen.queryByText(/billing/i)).toBeNull();
    expect(screen.queryByText(/subscription/i)).toBeNull();
  });
});
