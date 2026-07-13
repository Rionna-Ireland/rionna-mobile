import { Redirect, Stack } from 'expo-router';
import * as React from 'react';

import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';

export default function MemberLayout() {
  const status = useAuth.use.status();

  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="post/[space-id]/[post-id]"
        options={{
          title: '',
          headerBackTitle: 'Home',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F5F5F5' },
        }}
      />
    </Stack>
  );
}
