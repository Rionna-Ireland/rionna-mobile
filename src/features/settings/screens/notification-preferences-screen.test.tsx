/* eslint-disable react/no-unnecessary-use-prefix -- jest mock factories mirror real hook names */
import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { NotificationPreferencesScreen } from '@/features/settings/screens/notification-preferences-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 0 }));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

let mockQuery: Record<string, unknown>;
jest.mock('@/features/settings/api/use-preferences', () => ({
  usePreferences: () => mockQuery,
  useUpdatePreferences: () => ({ mutate: jest.fn() }),
}));

describe('notificationPreferencesScreen', () => {
  it('shows the switch-row skeleton on first load, not a spinner (A-015)', () => {
    mockQuery = { data: undefined, isPending: true, isFetching: true, isError: false, refetch: jest.fn() };
    render(<NotificationPreferencesScreen />);
    expect(screen.getByTestId('preferences-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('pref-push-enabled')).toBeNull();
  });

  it('shows the switches once preferences load', () => {
    mockQuery = {
      data: { pushEnabled: true, pushPreferences: {}, emailPreferences: {} },
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    };
    render(<NotificationPreferencesScreen />);
    expect(screen.getByTestId('pref-push-enabled')).toBeOnTheScreen();
    expect(screen.queryByTestId('preferences-loading')).toBeNull();
  });

  it('shows the error state with no data', () => {
    mockQuery = { data: undefined, isPending: false, isFetching: false, isError: true, refetch: jest.fn() };
    render(<NotificationPreferencesScreen />);
    expect(screen.getByText('Try again')).toBeOnTheScreen();
  });
});
