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
import { useFonts as useLocalFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { LogBox, StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { hydrateAuth, useAuthStore as useAuth } from '@/features/auth/use-auth-store';

import { APIProvider } from '@/lib/api';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
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
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

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

  // Hide splash once fonts are loaded and auth state is resolved
  React.useEffect(() => {
    if (jakartaLoaded && monoLoaded && eikoLoaded && status !== 'idle') {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [jakartaLoaded, monoLoaded, eikoLoaded, status]);

  // Keep splash visible until fonts are ready
  if (!jakartaLoaded || !monoLoaded || !eikoLoaded) {
    return null;
  }

  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="stables/[horse-id]"
          options={{
            title: '',
            headerBackTitle: 'Stables',
            headerTransparent: true,
          }}
        />
        <Stack.Screen
          name="news/[news-post-id]"
          options={{
            title: '',
            headerBackTitle: 'Pulse',
          }}
        />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      style={styles.container}
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
            </BottomSheetModalProvider>
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
