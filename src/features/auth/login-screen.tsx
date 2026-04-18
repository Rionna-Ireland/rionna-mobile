import type { AuthUser } from '@/lib/auth/utils';
import { useRouter } from 'expo-router';

import * as React from 'react';

import { FocusAwareStatusBar } from '@/components/ui';
import { LoginForm } from './components/login-form';
import { useAuthStore } from './use-auth-store';

export function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore.use.signIn();

  const onSuccess = (data: { token: string; user: AuthUser }) => {
    signIn(data.token, data.user);
    router.push('/');
  };

  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSuccess={onSuccess} />
    </>
  );
}
