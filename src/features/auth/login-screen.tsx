import type { AuthUser } from '@/lib/auth/utils';
import { useRouter } from 'expo-router';

import * as React from 'react';

import { FocusAwareStatusBar } from '@/components/ui';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';
import { LoginForm } from './components/login-form';
import { signOut, useAuthStore } from './use-auth-store';

export function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore.use.signIn();

  const onSuccess = async (data: { token: string; user: AuthUser }) => {
    signIn(data.token, data.user);
    try {
      await bootstrapMobileOrganization({ verifyMembership: true });
      router.push('/');
    }
    catch (error) {
      await signOut();
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
