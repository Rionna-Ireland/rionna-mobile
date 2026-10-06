import type { useAuthStore } from '@/features/auth/use-auth-store';
import { router } from 'expo-router';
import * as React from 'react';

type AuthStatus = ReturnType<typeof useAuthStore.use.status>;

/**
 * On sign-out (button, delete account, terms decline or a 401 tear-down), clear
 * every stacked screen and land on login. The (app) group's `<Redirect>` only
 * swaps the tabs, so a root-stack screen such as Profile or Settings would
 * otherwise stay on top.
 */
export function useSignOutRedirect(status: AuthStatus) {
  const previous = React.useRef(status);
  React.useEffect(() => {
    const was = previous.current;
    previous.current = status;
    if (was !== 'signIn' || status !== 'signOut')
      return;
    if (router.canDismiss())
      router.dismissAll();
    router.replace('/login');
  }, [status]);
}
