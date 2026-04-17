import Env from 'env';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Linking } from 'react-native';

import {
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { signOut, useAuthStore } from '@/features/auth/use-auth-store';
import { SettingsContainer } from '@/features/settings/components/settings-container';
import { SettingsItem } from '@/features/settings/components/settings-item';

// Lazy-require so a missing native module (dev client not yet rebuilt) doesn't
// crash the whole route. Falls back to Linking.openURL (system browser).
let WebBrowser: typeof import('expo-web-browser') | null = null;
try {
  WebBrowser = require('expo-web-browser');
}
catch {
  WebBrowser = null;
}

const PRIVACY_URL = 'https://pinkconnections.com/legal/privacy-policy';
const TERMS_URL = 'https://pinkconnections.com/legal/terms';

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore.use.user();

  const openLink = (url: string) => {
    if (WebBrowser) {
      WebBrowser.openBrowserAsync(url).catch(() => {});
    }
    else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 bg-background">
        <View className="flex-1 px-4 pt-6 pb-10">
          <Text className="font-display text-3xl text-black dark:text-white">
            More
          </Text>

          <SettingsContainer title="settings.notifications.title">
            <SettingsItem
              text="settings.notifications.preferences"
              onPress={() => router.push('/settings/notifications')}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.account.title">
            <SettingsItem
              text="settings.account.email"
              value={user?.email ?? ''}
            />
            <SettingsItem
              text="settings.account.changePassword"
              onPress={() => router.push('/settings/change-password')}
            />
            <SettingsItem
              text="settings.account.deleteAccount"
              onPress={() => router.push('/settings/delete-account')}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.club"
              value={Env.EXPO_PUBLIC_CLUB_NAME}
            />
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.legal">
            <SettingsItem
              text="settings.privacy"
              onPress={() => openLink(PRIVACY_URL)}
            />
            <SettingsItem
              text="settings.terms"
              onPress={() => openLink(TERMS_URL)}
            />
          </SettingsContainer>

          <View className="mt-8">
            <Button
              variant="outline"
              label="Sign out"
              onPress={signOut}
              testID="sign-out-button"
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}
