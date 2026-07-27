import type * as DeviceType from 'expo-device';
import type * as NotificationsType from 'expo-notifications';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { client } from '@/lib/api/client';

// Lazy-require native modules so a stale dev client (no rebuild yet) doesn't
// crash the bundle at module evaluation time. When missing we silently skip
// registration — it's a no-op on simulator anyway.
let Device: typeof DeviceType | null = null;
let Notifications: typeof NotificationsType | null = null;
try {
  Device = require('expo-device');
}
catch {
  Device = null;
}
try {
  Notifications = require('expo-notifications');
}
catch {
  Notifications = null;
}

export async function registerForPushNotifications(): Promise<
  string | undefined
> {
  if (!Device?.isDevice || !Notifications)
    return undefined;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    status = requested.status;
  }
  if (status !== 'granted')
    return undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  try {
    await client.post('/api/push/register', {
      expoPushToken: token.data,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  }
  catch (err) {
    console.warn('Failed to register push token', err);
  }

  return token.data;
}
