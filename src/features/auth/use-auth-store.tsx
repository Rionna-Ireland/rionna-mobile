import type * as DeviceType from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import type { AuthUser, TokenType } from '@/lib/auth/utils';

import Env from 'env';
import Constants from 'expo-constants';
import { create } from 'zustand';
import { EVENTS_SNAPSHOT_PREFIX } from '@/features/events/api/use-events';
import { clearAllEventReminders } from '@/features/events/lib/event-reminders';
import { clearMemberContentCache } from '@/features/member-content/cache/member-content-cache';
import { INBOX_SNAPSHOT_PREFIX } from '@/features/notification-centre/api/use-inbox';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { bootstrapMobileOrganization } from '@/lib/auth/mobile-org-bootstrap';
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  setToken,
  setUser,
} from '@/lib/auth/utils';
import { removeItemsWithPrefix } from '@/lib/storage';
import { createSelectors } from '@/lib/utils';

/**
 * Leave nothing of this member behind (M-05, M-19): every in-memory query, the
 * MMKV offline snapshots and scheduled event reminders. Best-effort per step,
 * so one failure never blocks the rest or logout itself.
 */
async function clearMemberData(signedInMember: AuthUser | null): Promise<void> {
  queryClient.clear();
  try {
    if (signedInMember)
      clearMemberContentCache({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: signedInMember.id });
    removeItemsWithPrefix(EVENTS_SNAPSHOT_PREFIX);
    removeItemsWithPrefix(INBOX_SNAPSHOT_PREFIX);
  }
  catch (e) {
    console.warn('[auth] Failed to clear offline snapshots (continuing logout):', e);
  }
  try {
    await clearAllEventReminders();
  }
  catch (e) {
    console.warn('[auth] Failed to clear event reminders (continuing logout):', e);
  }
}

// Sign-out must finish on a bad network: each network step gives up after this.
const SIGN_OUT_TIMEOUT_MS = 5000;

/**
 * Best-effort push unregister. Runs while the token is still held, and the
 * backend also accepts it without a session (M-06) so the 401 tear-down path
 * still stops this device getting the old member's pushes.
 */
async function unregisterPushToken(): Promise<void> {
  // Lazy-require native modules so sign-out still works on a dev client that
  // hasn't been rebuilt with expo-device / expo-notifications yet.
  let Device: typeof DeviceType | null = null;
  let Notifications: typeof NotificationsType | null = null;
  try {
    Device = require('expo-device');
    Notifications = require('expo-notifications');
  }
  catch {}
  if (!Device?.isDevice || !Notifications)
    return;

  try {
    const token = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId }),
      new Promise<null>(resolve => setTimeout(resolve, SIGN_OUT_TIMEOUT_MS, null)),
    ]);
    if (token?.data)
      await client.post('/api/push/unregister', { expoPushToken: token.data }, { timeout: SIGN_OUT_TIMEOUT_MS });
  }
  catch (e) {
    console.warn('Failed to unregister Expo push token:', e);
  }
}

// Every 401 calls signOut (M-08): concurrent callers share one tear-down.
let pendingSignOut: Promise<void> | null = null;

type AuthState = {
  token: TokenType | null;
  user: AuthUser | null;
  status: 'idle' | 'signOut' | 'signIn';
  signIn: (token: TokenType, user: AuthUser) => void;
  signOut: () => Promise<void>;
  hydrate: () => void;
};

const _useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  token: null,
  user: null,
  signIn: (token, user) => {
    setToken(token);
    setUser(user);
    set({ status: 'signIn', token, user });
  },
  signOut: () => {
    if (pendingSignOut)
      return pendingSignOut;
    pendingSignOut = (async () => {
      try {
        const signedInMember = get().user;
        // Both calls need the bearer token, so they go before it is dropped.
        await unregisterPushToken();
        await client.post('/api/auth/sign-out', undefined, { timeout: SIGN_OUT_TIMEOUT_MS }).catch(() => {});

        removeToken();
        removeUser();
        await clearMemberData(signedInMember);
        set({ status: 'signOut', token: null, user: null });
      }
      finally {
        pendingSignOut = null;
      }
    })();
    return pendingSignOut;
  },
  hydrate: () => {
    try {
      const userToken = getToken();
      const userData = getUser();
      if (userToken !== null) {
        set({ status: 'signIn', token: userToken, user: userData });
        bootstrapMobileOrganization().catch((e) => {
          console.warn('Mobile organization bootstrap failed during hydration:', e);
        });
      }
      else {
        // Nothing to clean up, and no network before the login screen (M-04).
        set({ status: 'signOut' });
      }
    }
    catch (e) {
      console.error('Auth hydration error:', e);
      get().signOut();
    }
  },
}));

export const useAuthStore = createSelectors(_useAuthStore);

export function signOut() {
  return _useAuthStore.getState().signOut();
}
export function signIn(token: TokenType, user: AuthUser) {
  return _useAuthStore.getState().signIn(token, user);
}
export function getAuthStatus() {
  return _useAuthStore.getState().status;
}
export const hydrateAuth = () => _useAuthStore.getState().hydrate();
