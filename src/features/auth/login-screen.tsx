import type { AuthUser } from '@/lib/auth/utils';
import { useRouter } from 'expo-router';

import * as React from 'react';

import { FocusAwareStatusBar, ScreenBackground, View } from '@/components/ui';
import { useArrival } from '@/features/arrival/arrival-context';
import { client } from '@/lib/api/client';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';
import { removeUser, setUser } from '@/lib/auth/utils';
import { LoginForm } from './components/login-form';
import { stageAuthToken, useAuthStore } from './use-auth-store';

export function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore.use.signIn();
  const { beginWelcome } = useArrival();

  const onSuccess = async (data: { token: string; user: AuthUser }) => {
    // Token first (in memory only) so verify can send Bearer. Delay signIn status until after
    // bootstrap — that status starts push permission + Circle prewarm.
    stageAuthToken(data.token);
    setUser(data.user);
    try {
      await bootstrapMobileOrganization({ verifyMembership: true });
      signIn(data.token, data.user);
      // S14-04: the welcome covers this screen, Home mounts underneath, and the
      // mark hands off to Home's header once Home is ready.
      beginWelcome({ id: data.user.id, name: data.user.name }, () => router.replace('/'));
    }
    catch (error) {
      // Login created a server session; end it, not just the local copy (M-02).
      await client.post('/api/auth/sign-out').catch(() => {});
      stageAuthToken(null);
      removeUser();
      throw error;
    }
  };

  return (
    <View className="flex-1">
      <FocusAwareStatusBar barStyle="light" />
      <ScreenBackground variant="welcome-navy" />
      <LoginForm onSuccess={onSuccess} />
    </View>
  );
}
