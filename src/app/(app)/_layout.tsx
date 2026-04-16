import { Redirect, SplashScreen, Tabs } from 'expo-router';
import * as React from 'react';
import { useCallback, useEffect } from 'react';

import {
  Horse as HorseIcon,
  Menu as MenuIcon,
  Pulse as PulseIcon,
  Users as UsersIcon,
} from '@/components/ui/icons';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

export default function TabLayout() {
  const status = useAuth.use.status();
  const [isFirstTime] = useIsFirstTime();
  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);
  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        hideSplash();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hideSplash, status]);

  if (isFirstTime) {
    return <Redirect href="/onboarding" />;
  }
  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color }) => <PulseIcon color={color} />,
          tabBarButtonTestID: 'pulse-tab',
        }}
      />
      <Tabs.Screen
        name="stables"
        options={{
          title: 'Stables',
          tabBarIcon: ({ color }) => <HorseIcon color={color} />,
          tabBarButtonTestID: 'stables-tab',
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <UsersIcon color={color} />,
          tabBarButtonTestID: 'community-tab',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MenuIcon color={color} />,
          tabBarButtonTestID: 'more-tab',
        }}
      />
    </Tabs>
  );
}
