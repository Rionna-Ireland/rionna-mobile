import type * as Notifications from 'expo-notifications';

import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useNotificationTapRouting } from '@/features/notifications/use-notification-tap-routing';

type AuthStatus = 'idle' | 'signIn' | 'signOut';

const mockNotifications = {
  last: null as Notifications.NotificationResponse | null,
  listener: null as ((r: Notifications.NotificationResponse) => void) | null,
};

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: () => mockNotifications.last,
  clearLastNotificationResponse: jest.fn(() => {
    mockNotifications.last = null;
  }),
  addNotificationResponseReceivedListener: (fn: (r: Notifications.NotificationResponse) => void) => {
    mockNotifications.listener = fn;
    return { remove: () => {
      mockNotifications.listener = null;
    } };
  },
}));

function makeResponse(identifier: string, data: unknown): Notifications.NotificationResponse {
  return {
    notification: { request: { identifier, content: { data } } },
  } as unknown as Notifications.NotificationResponse;
}

describe('useNotificationTapRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifications.last = null;
    mockNotifications.listener = null;
  });

  it('waits for auth hydration, then routes a cold-start tap once', () => {
    mockNotifications.last = makeResponse('n-1', { screen: 'horse', horseId: 'h-1' });

    const { rerender } = renderHook(({ status }: { status: AuthStatus }) => useNotificationTapRouting(status), {
      initialProps: { status: 'idle' as AuthStatus },
    });
    expect(router.push).not.toHaveBeenCalled();

    rerender({ status: 'signIn' });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/stables/[horse-id]', params: { 'horse-id': 'h-1' } });

    // The listener re-delivering the same response (and a re-run) must not route again.
    mockNotifications.listener?.(makeResponse('n-1', { screen: 'horse', horseId: 'h-1' }));
    rerender({ status: 'idle' });
    rerender({ status: 'signIn' });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('drops a tap held while signed out, so the next login is not hijacked', () => {
    mockNotifications.last = makeResponse('n-3', { screen: 'horse', horseId: 'h-3' });

    const { rerender } = renderHook(({ status }: { status: AuthStatus }) => useNotificationTapRouting(status), {
      initialProps: { status: 'signOut' as AuthStatus },
    });
    rerender({ status: 'signIn' });

    expect(router.push).not.toHaveBeenCalled();
  });

  it('routes a warm tap once', () => {
    renderHook(() => useNotificationTapRouting('signIn'));

    const response = makeResponse('n-2', { screen: 'notifications' });
    mockNotifications.listener?.(response);
    mockNotifications.listener?.(response);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });
});
