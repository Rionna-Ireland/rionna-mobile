import type * as NotificationsType from 'expo-notifications';

// Lazy-require expo-notifications so a dev client missing the native module
// (not yet rebuilt after adding the dependency) doesn't crash module evaluation
// for every route in the app. See S3-04 / S3-06 findings.
let Notifications: typeof NotificationsType | null = null;
try {
  Notifications = require('expo-notifications');
}
catch {
  Notifications = null;
}

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
