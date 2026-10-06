import * as React from 'react';

import { client } from '@/lib/api/client';
import { cleanup, fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { LoginForm } from './login-form';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));
jest.mock('@/features/arrival/login-media', () => ({ LoginMedia: () => null }));
jest.mock('@/features/arrival/arrival-slot', () => ({
  ArrivalSlot: ({ children }: { children: React.ReactNode }) => children,
}));

jest.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(cleanup);

function fillAndSubmit() {
  fireEvent.changeText(screen.getByTestId('email-input'), 'jane@example.com');
  fireEvent.changeText(screen.getByTestId('password-input'), 'secret123');
  fireEvent(screen.getByTestId('password-input'), 'submitEditing');
}

describe('loginForm', () => {
  it('chains Return from email to password, and submits from the password (A-008)', async () => {
    jest.mocked(client.post).mockResolvedValue({ data: { token: 't', user: { id: 'u' } } });
    const onSuccess = jest.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    const email = screen.getByTestId('email-input');
    const password = screen.getByTestId('password-input');
    expect(email.props).toEqual(expect.objectContaining({ textContentType: 'username', returnKeyType: 'next' }));
    expect(password.props).toEqual(expect.objectContaining({
      autoComplete: 'current-password',
      textContentType: 'password',
      returnKeyType: 'go',
    }));
    fillAndSubmit();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ token: 't', user: { id: 'u' } }));
  });

  it('shows human copy, not the server message, when sign-in fails (A-007)', async () => {
    jest.mocked(client.post).mockRejectedValue({ response: { status: 401, data: { message: 'INVALID_EMAIL_OR_PASSWORD' } } });
    render(<LoginForm onSuccess={jest.fn()} />);
    fillAndSubmit();
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'That email and password don’t match. Try again, or reset your password.',
    );
    expect(screen.queryByText(/INVALID_EMAIL/)).not.toBeOnTheScreen();
  });
});
