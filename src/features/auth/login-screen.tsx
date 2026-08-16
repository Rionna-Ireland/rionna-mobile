import type { AuthUser } from '@/lib/auth/utils';
import { useRouter } from 'expo-router';

import * as React from 'react';

import { FocusAwareStatusBar } from '@/components/ui';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';
import { removeToken, removeUser, setToken, setUser } from '@/lib/auth/utils';
import { LoginForm } from './components/login-form';
import { useAuthStore } from './use-auth-store';

export function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore.use.signIn();

  const onSuccess = async (data: { token: string; user: AuthUser }) => {
    // Token first so verify can send Bearer. Delay signIn status until after
    // bootstrap — that status starts push permission + Circle prewarm.
    setToken(data.token);
    setUser(data.user);
    try {
      await bootstrapMobileOrganization({ verifyMembership: true });
      signIn(data.token, data.user);
      router.replace('/');
    }
    catch (error) {
      removeToken();
      removeUser();
      throw error;
    }
  };

  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSuccess={onSuccess} />
    </>
  );
}
