import type * as NotificationsType from 'expo-notifications';

import Env from 'env';

import { client } from '@/lib/api/client';

let Notifications: typeof NotificationsType | null = null;
try {
  Notifications = require('expo-notifications');
}
catch {
  Notifications = null;
}

export async function syncNotificationBadgeCount(): Promise<void> {
  if (!Notifications?.setBadgeCountAsync)
    return;

  try {
    const { data } = await client.get('/api/circle/notification-badge-count', {
      params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID },
    });
    const count = typeof data?.count === 'number' ? data.count : 0;
    await Notifications.setBadgeCountAsync(Math.max(0, Math.min(99, count)));
  }
  catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      await Notifications.setBadgeCountAsync(0);
      return;
    }
    console.warn('Failed to sync notification badge count', err);
  }
}

export async function clearNotificationBadgeCount(): Promise<void> {
  if (!Notifications?.setBadgeCountAsync)
    return;

  try {
    await Notifications.setBadgeCountAsync(0);
  }
  catch {
    // Best effort only.
  }
}
