import type * as NotificationsType from 'expo-notifications';

import * as React from 'react';

import { handleNotificationResponse } from '@/features/notifications/deep-link';

/**
 * M-12: routes push taps, cold and warm, once the navigator is mounted and the
 * member is signed in. A cold-start tap is read back with
 * getLastNotificationResponse (what useLastNotificationResponse does) because
 * the tap fires before the Stack can navigate. Call it from the component that
 * renders the Stack, so the navigator is mounted when the effect runs.
 */
export function useNotificationTapRouting(signedIn: boolean) {
  const handledId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!signedIn)
      return;
    let Notifications: typeof NotificationsType;
    try {
      Notifications = require('expo-notifications');
    }
    catch {
      return;
    }

    const route = (response: NotificationsType.NotificationResponse | null) => {
      const id = response?.notification.request.identifier;
      if (!response || !id || id === handledId.current)
        return;
      handledId.current = id;
      // Cleared so a remounted root layout does not replay an old tap.
      Notifications.clearLastNotificationResponse();
      try {
        handleNotificationResponse(response);
      }
      catch (err) {
        // A navigator that is not ready throws; landing on Home beats crashing the launch.
        console.warn('Push tap routing failed', err);
      }
    };

    route(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(route);
    return () => subscription.remove();
  }, [signedIn]);
}
