import { Redirect, Tabs } from 'expo-router';
import * as React from 'react';

import {
  Horse as HorseIcon,
  Menu as MenuIcon,
  Pulse as PulseIcon,
  Users as UsersIcon,
} from '@/components/ui/icons';
import { CustomTabBar } from '@/components/ui/tab-bar';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';

export default function TabLayout() {
  const status = useAuth.use.status();

  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }
  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />}>
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
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color }) => <PulseIcon color={color} />,
          tabBarButtonTestID: 'pulse-tab',
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
