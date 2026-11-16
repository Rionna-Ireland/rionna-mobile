import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import ChangePasswordScreen from '@/app/settings/change-password';
import { signIn } from '@/features/auth/use-auth-store';

import { client } from '@/lib/api/client';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});
jest.mock('@/features/settings/components/page-header', () => ({ PageHeader: () => null }));
jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));
jest.mock('@/features/auth/use-auth-store', () => ({
  signIn: jest.fn(),
  useAuthStore: { getState: () => ({ user: { id: 'member-a', email: 'a@example.com' } }) },
}));

describe('changePasswordScreen', () => {
  it('revokes other sessions and keeps this device signed in with the new token', async () => {
    (client.post as jest.Mock).mockResolvedValue({ data: { token: 'new-token', user: {} } });
    render(<ChangePasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'old-password');
    fireEvent.changeText(screen.getByLabelText('New password'), 'new-password');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'new-password');
    fireEvent.press(screen.getByText('Update password'));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('new-token', { id: 'member-a', email: 'a@example.com' }));
    expect(client.post).toHaveBeenCalledWith('/api/auth/change-password', expect.objectContaining({ revokeOtherSessions: true }));
  });
});
