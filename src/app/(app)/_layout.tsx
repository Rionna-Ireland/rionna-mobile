import { Redirect, Tabs } from 'expo-router';
import * as React from 'react';

import { CustomTabBar } from '@/components/ui/tab-bar';
import { ArrivalSplash } from '@/features/arrival/arrival-splash';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { translate } from '@/lib/i18n';
import { useMotion } from '@/lib/motion';
import { tabTransitionOptions } from '@/lib/motion/tab-transition';

export default function MemberLayout() {
  const status = useAuth.use.status();
  const { reduceMotion } = useMotion();
  // S14-02 §4: fade-through between tabs; screens stay mounted.
  const screenOptions = React.useMemo(
    () => ({ headerShown: false, ...tabTransitionOptions(reduceMotion) }),
    [reduceMotion],
  );

  // Auth still hydrating: show the launch splash (frame 1) instead of a blank screen.
  if (status === 'idle') {
    return <ArrivalSplash />;
  }
  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={screenOptions}
    >
      <Tabs.Screen name="index" options={{ title: translate('nav.home') }} />
      <Tabs.Screen name="stables" options={{ title: translate('nav.stables') }} />
      <Tabs.Screen name="community" options={{ title: translate('nav.community') }} />
      <Tabs.Screen name="events" options={{ title: translate('nav.events') }} />
      <Tabs.Screen name="paddock" options={{ title: translate('nav.paddock') }} />
    </Tabs>
  );
}
