import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useSignOutRedirect } from './use-sign-out-redirect';

jest.mock('expo-router', () => ({
  router: { canDismiss: jest.fn(() => true), dismissAll: jest.fn(), replace: jest.fn() },
}));

type Status = Parameters<typeof useSignOutRedirect>[0];

describe('useSignOutRedirect', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dismisses the stack and goes to login when a signed-in member signs out', () => {
    const { rerender } = renderHook(({ status }: { status: Status }) => useSignOutRedirect(status), {
      initialProps: { status: 'signIn' as Status },
    });
    rerender({ status: 'signOut' as Status });
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('skips dismissAll when there is nothing to dismiss', () => {
    (router.canDismiss as jest.Mock).mockReturnValueOnce(false);
    const { rerender } = renderHook(({ status }: { status: Status }) => useSignOutRedirect(status), {
      initialProps: { status: 'signIn' as Status },
    });
    rerender({ status: 'signOut' as Status });
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('does nothing on a cold start that is already signed out', () => {
    renderHook(() => useSignOutRedirect('signOut' as Status));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
