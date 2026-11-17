import type * as Notifications from 'expo-notifications';

import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useNotificationTapRouting } from '@/features/notifications/use-notification-tap-routing';

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

  it('waits for sign-in, then routes a cold-start tap once', () => {
    mockNotifications.last = makeResponse('n-1', { screen: 'horse', horseId: 'h-1' });

    const { rerender } = renderHook(({ signedIn }: { signedIn: boolean }) => useNotificationTapRouting(signedIn), {
      initialProps: { signedIn: false },
    });
    expect(router.push).not.toHaveBeenCalled();

    rerender({ signedIn: true });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/stables/[horse-id]', params: { 'horse-id': 'h-1' } });

    // The listener re-delivering the same response (and a re-run) must not route again.
    mockNotifications.listener?.(makeResponse('n-1', { screen: 'horse', horseId: 'h-1' }));
    rerender({ signedIn: false });
    rerender({ signedIn: true });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('routes a warm tap once', () => {
    renderHook(() => useNotificationTapRouting(true));

    const response = makeResponse('n-2', { screen: 'notifications' });
    mockNotifications.listener?.(response);
    mockNotifications.listener?.(response);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });
});
