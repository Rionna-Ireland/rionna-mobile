import type * as DeviceType from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import type { AuthUser, TokenType } from '@/lib/auth/utils';

import Env from 'env';
import Constants from 'expo-constants';
import { create } from 'zustand';
import { clearCircleWebViewCookies } from '@/features/community/lib/circle-cookie-clear';
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
import { removeItem, removeItemsWithPrefix } from '@/lib/storage';
import { createSelectors } from '@/lib/utils';

// Legacy MMKV keys from the retired Circle WebView build (S6-03/S6-04). The
// app is now fully native — nothing writes these keys any more — but a device
// upgrading from a WebView build may still have them on disk, so we keep
// clearing them best-effort on sign-out.
const CIRCLE_SESSION_KEY = 'circle.session.v1';
const CIRCLE_COMMUNITY_BASE_URL_KEY = 'circle.communityBaseUrl.v1';

/**
 * Best-effort cleanup of the retired Circle WebView's on-device state on
 * sign-out. There is no server-side revoke any more (the WebView, and the
 * session it held, are gone) — this only clears state a pre-native-migration
 * install may still be carrying:
 *
 *   1. The legacy cached-session MMKV keys (session token + community base
 *      URL), in case a device upgrading from a WebView build still has them.
 *   2. The live WebView cookies / web storage (modules/circle-cookies), in
 *      case a device upgrading from a WebView build still has an active
 *      Circle cookie session that could otherwise leak across members.
 *
 * Every step is best-effort: a failure in either MUST NOT block the rest, nor
 * block logout.
 */
async function clearLegacyCircleState(): Promise<void> {
  try {
    void removeItem(CIRCLE_SESSION_KEY);
    void removeItem(CIRCLE_COMMUNITY_BASE_URL_KEY);
  }
  catch (e) {
    console.warn('[auth] Failed to clear legacy Circle session keys (continuing logout):', e);
  }

  try {
    await clearCircleWebViewCookies();
  }
  catch (e) {
    console.warn('[auth] Failed to clear live Circle WebView cookies (continuing logout):', e);
  }
}

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
    const run = (async () => {
      const signedInMember = get().user;
      try {
        // Both calls need the bearer token, so they go before it is dropped.
        await unregisterPushToken();
        await client.post('/api/auth/sign-out', undefined, { timeout: SIGN_OUT_TIMEOUT_MS }).catch(() => {});

        // Best-effort cleanup of any legacy Circle WebView state a device
        // upgrading from a pre-native build may still be carrying.
        await clearLegacyCircleState();

        removeToken();
        removeUser();
      }
      catch (e) {
        console.warn('[auth] Sign-out step failed (continuing logout):', e);
      }
      // Drop the in-memory token and unmount member screens before clearing
      // their caches, so nothing refetches the previous member's data.
      set({ status: 'signOut', token: null, user: null });
      try {
        await clearMemberData(signedInMember);
      }
      finally {
        pendingSignOut = null;
      }
    })();
    pendingSignOut = run;
    return run;
  },
  hydrate: () => {
    try {
      const userToken = getToken();
      const userData = getUser();
      // Keychain outlives an iOS uninstall; MMKV (the user) does not, so a
      // token without a user is a leftover from a previous install.
      if (userToken !== null && userData !== null) {
        set({ status: 'signIn', token: userToken, user: userData });
        bootstrapMobileOrganization().catch((e) => {
          console.warn('Mobile organization bootstrap failed during hydration:', e);
        });
      }
      else {
        // No network before the login screen (M-04).
        if (userToken !== null)
          removeToken();
        set({ status: 'signOut' });
      }
    }
    catch (e) {
      console.error('Auth hydration error:', e);
      // Local only, no network before the login screen (M-04).
      removeToken();
      set({ status: 'signOut' });
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
/** The in-memory token every request sends (M-01: never read from storage per request). */
export function getAuthToken() {
  return _useAuthStore.getState().token;
}
/** Login: hold the token in memory for the membership check, persist only on signIn. */
export function stageAuthToken(token: TokenType | null) {
  _useAuthStore.setState({ token });
}
export function getAuthStatus() {
  return _useAuthStore.getState().status;
}
export const hydrateAuth = () => _useAuthStore.getState().hydrate();
