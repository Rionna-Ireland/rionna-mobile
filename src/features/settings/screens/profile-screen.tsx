import type * as WebBrowserType from 'expo-web-browser';

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
let WebBrowser: typeof WebBrowserType | null = null;
try {
  WebBrowser = require('expo-web-browser');
}
catch {
  WebBrowser = null;
}

const PRIVACY_URL = 'https://rionna.com/legal/privacy-policy';
const TERMS_URL = 'https://rionna.com/legal/terms';

export function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const displayName = user?.name?.trim() || 'Rionna member';

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
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-1 px-4 pt-6">
          <View className="mb-2 flex-row items-center gap-4">
            <View className="size-14 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100">
              <Text className="font-sans text-xl font-semibold text-neutral-900">
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans text-xl font-semibold text-ink">{displayName}</Text>
              <Text className="mt-0.5 font-sans text-sm text-neutral-600">
                {user?.email ?? ''}
              </Text>
            </View>
          </View>

          {/* D9: membership is display-only — no billing actions, no renewal CTAs. */}
          <SettingsContainer title="settings.profile.membership">
            <SettingsItem
              text="settings.profile.membershipStatus"
              value="Active member"
            />
            <SettingsItem
              text="settings.profile.club"
              value={Env.EXPO_PUBLIC_CLUB_NAME}
            />
          </SettingsContainer>

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
