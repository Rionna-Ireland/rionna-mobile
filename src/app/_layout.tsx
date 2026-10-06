import type * as NotificationsType from 'expo-notifications';

import {
  IBMPlexMono_400Regular,
  useFonts as useIBMPlexMonoFonts,
} from '@expo-google-fonts/ibm-plex-mono';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as usePlusJakartaSansFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import Env from 'env';
import { useFonts as useLocalFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { AppState, LogBox, StyleSheet, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import colors from '@/components/ui/colors';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { ArrivalOverlay } from '@/features/arrival/arrival-overlay';
import { ArrivalProvider } from '@/features/arrival/arrival-provider';
import { hydrateAuth, useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { HeroTransitionProvider } from '@/features/hero-transition/hero-transition-provider';
import { TermsGate } from '@/features/legal/terms-gate';
import { NOTIFICATION_CENTRE_QUERY_ROOT } from '@/features/notification-centre/types';
import {
  clearNotificationBadgeCount,
  syncNotificationBadgeCount,
} from '@/features/notifications/badge';
import { handleNotificationResponse } from '@/features/notifications/deep-link';
import { registerForPushNotifications } from '@/features/notifications/setup';
import { APIProvider } from '@/lib/api';
import { queryClient } from '@/lib/api/query-client';

import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { durations, MotionProvider } from '@/lib/motion';
import '@/features/notifications/handler';
// Import  global CSS file
import '../global.css';

// Third-party libs (and a few RN internals) still mount RN's deprecated
// SafeAreaView. Our own code uses react-native-safe-area-context everywhere.
LogBox.ignoreLogs([/SafeAreaView has been deprecated/]);

export { ErrorBoundary } from 'expo-router';

// eslint-disable-next-line react-refresh/only-export-components
export const unstable_settings = {
  initialRouteName: '(app)',
};

hydrateAuth();
loadSelectedTheme();
// Keep the (blank white) native splash up until the Arrival overlay's first
// layout, which hides it with the mark mounted at progress 0 (S14-04 §2). The
// two frames are identical, so there's no fade.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false });

function useNotificationRegistration(status: ReturnType<typeof useAuth.use.status>) {
  React.useEffect(() => {
    if (status === 'signIn') {
      registerForPushNotifications()
        .then(() => syncNotificationBadgeCount())
        .catch(() => {});
    }
    if (status === 'signOut') {
      clearNotificationBadgeCount().catch(() => {});
    }
  }, [status]);
}

function useNotificationBadgeSync(status: ReturnType<typeof useAuth.use.status>) {
  React.useEffect(() => {
    if (status !== 'signIn')
      return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncNotificationBadgeCount().catch(() => {});
        void queryClient.invalidateQueries({
          queryKey: [NOTIFICATION_CENTRE_QUERY_ROOT, Env.EXPO_PUBLIC_CLUB_ID],
        });
      }
    });

    syncNotificationBadgeCount().catch(() => {});
    return () => subscription.remove();
  }, [status]);
}

// S12-06b: a push notification received while the app is foregrounded doesn't
// trigger AppState's 'active' transition (the app never backgrounded), so the
// inbox list + badge queries would otherwise go stale until the next
// foreground. Invalidate them directly off the notification-received event.
function useForegroundNotificationRefresh() {
  React.useEffect(() => {
    let NotificationsMod: typeof NotificationsType | null = null;
    try {
      NotificationsMod = require('expo-notifications');
    }
    catch {
      return;
    }
    if (!NotificationsMod)
      return;
    const subscription = NotificationsMod.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATION_CENTRE_QUERY_ROOT] });
    });
    return () => subscription.remove();
  }, []);
}

function useNotificationResponseListener() {
  React.useEffect(() => {
    let NotificationsMod: typeof NotificationsType | null = null;
    try {
      NotificationsMod = require('expo-notifications');
    }
    catch {
      return;
    }
    if (!NotificationsMod)
      return;
    const subscription = NotificationsMod.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  const status = useAuth.use.status();

  // Load fonts under the exact family names referenced in global.css @theme.
  // font-sans → PlusJakartaSans, font-display → PPEiko, font-mono → IBMPlexMono
  const [jakartaLoaded] = usePlusJakartaSansFonts({
    PlusJakartaSans: PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [monoLoaded] = useIBMPlexMonoFonts({
    IBMPlexMono: IBMPlexMono_400Regular,
  });
  const [eikoLoaded] = useLocalFonts({
    'PPEiko': require('../../assets/fonts/PPEiko-Medium.otf'),
    'PPEiko-Thin': require('../../assets/fonts/PPEiko-Thin.otf'),
    'PPEiko-Heavy': require('../../assets/fonts/PPEiko-Heavy.otf'),
  });
  const fontsLoaded = jakartaLoaded && monoLoaded && eikoLoaded;

  useNotificationRegistration(status);
  useNotificationBadgeSync(status);
  useNotificationResponseListener();
  useForegroundNotificationRefresh();

  // The Arrival overlay draws while fonts load; the app mounts beneath it.
  return (
    <ArrivalProvider status={status}>
      <View style={styles.container}>
        {fontsLoaded && <AppStack />}
        <ArrivalOverlay />
      </View>
    </ArrivalProvider>
  );
}

function AppStack() {
  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="stables/[horse-id]" options={horseDetailOptions} />
        {/* Design V2 screens draw their own ScreenHeader (with back), so the native header stays hidden. */}
        {MODAL_STACK_SCREENS.map(({ name, options }) => (
          <Stack.Screen key={name} name={name} options={{ ...options, headerShown: false }} />
        ))}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      <TermsGate />
    </Providers>
  );
}

/**
 * Horse detail (S14-05 §4): opened by the hero transition (`?transition=hero`)
 * or as its Reduce Motion / low-end fallback (`?transition=fade`), the stack
 * only crossfades (`quick`) under the overlay; otherwise (deep links, no
 * photo) it's the default push. The iOS edge swipe keeps the native animation
 * either way (`animationMatchesGesture` stays false).
 */
function horseDetailOptions({ route }: { route: { params?: object } }) {
  const params = route.params as { transition?: string } | undefined;
  const crossfade = params?.transition === 'hero' || params?.transition === 'fade';
  return {
    title: '',
    headerBackTitle: 'Stables',
    headerTransparent: true,
    headerShown: false,
    ...(crossfade ? { animation: 'fade' as const, animationDuration: durations.quick } : null),
  };
}

const MODAL_STACK_SCREENS: {
  name: string;
  options: React.ComponentProps<typeof Stack.Screen>['options'];
}[] = [
  {
    name: 'post/[space-id]/[post-id]',
    options: {
      title: '',
      headerBackTitle: 'Community',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
    },
  },
  {
    name: 'post/new',
    options: { title: 'New post', presentation: 'modal', headerBackTitle: 'Cancel' },
  },
  {
    name: 'space-feed/[space-id]',
    options: {
      title: '',
      headerBackTitle: 'Back',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
    },
  },
  {
    name: 'event/[event-id]',
    options: {
      title: '',
      headerBackTitle: 'Events',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
    },
  },
  {
    name: 'news/[news-post-id]',
    options: { title: '', headerBackTitle: 'Pulse' },
  },
  {
    name: 'paddock/benefits',
    options: { title: 'Member benefits', headerBackTitle: 'The Paddock' },
  },
  {
    name: 'paddock/charity',
    options: { title: 'Charity impact', headerBackTitle: 'The Paddock' },
  },
  { name: 'profile', options: { title: 'Profile', headerBackTitle: 'Back' } },
  { name: 'notifications', options: { title: 'Notifications', headerBackTitle: 'Home' } },
  {
    name: 'settings/notifications',
    options: { title: 'Notifications', headerBackTitle: 'Profile' },
  },
  {
    name: 'settings/change-password',
    options: { title: 'Password', headerBackTitle: 'Profile' },
  },
  {
    name: 'settings/delete-account',
    options: { title: 'Delete Account', headerBackTitle: 'Profile' },
  },
];

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      style={styles.container}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <MotionProvider>
              <BottomSheetModalProvider>
                <HeroTransitionProvider>{children}</HeroTransitionProvider>
                <FlashMessage position="top" />
              </BottomSheetModalProvider>
            </MotionProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
