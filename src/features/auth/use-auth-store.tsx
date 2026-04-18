import type * as DeviceType from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import type { AuthUser, TokenType } from '@/lib/auth/utils';

import Constants from 'expo-constants';
import { create } from 'zustand';
import { client } from '@/lib/api/client';
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  setToken,
  setUser,
} from '@/lib/auth/utils';
import { createSelectors } from '@/lib/utils';

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
  signOut: async () => {
    // Lazy-require native modules so sign-out still works on a dev client that
    // hasn't been rebuilt with expo-device / expo-notifications yet.
    let Device: typeof DeviceType | null = null;
    let Notifications: typeof NotificationsType | null = null;
    try {
      Device = require('expo-device');
    }
    catch {}
    try {
      Notifications = require('expo-notifications');
    }
    catch {}

    if (Device?.isDevice && Notifications) {
      let expoPushToken: string | null = null;
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        expoPushToken = token?.data ?? null;
      }
      catch (e) {
        console.warn('Failed to get Expo push token during sign-out:', e);
      }

      if (expoPushToken) {
        try {
          await client.post('/api/push/unregister', { expoPushToken });
        }
        catch (e) {
          console.warn('Failed to unregister Expo push token:', e);
        }
      }
    }

    removeToken();
    removeUser();
    set({ status: 'signOut', token: null, user: null });
  },
  hydrate: () => {
    try {
      const userToken = getToken();
      const userData = getUser();
      if (userToken !== null) {
        set({ status: 'signIn', token: userToken, user: userData });
      }
      else {
        get().signOut();
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
  _useAuthStore.getState().signOut();
}
export function signIn(token: TokenType, user: AuthUser) {
  return _useAuthStore.getState().signIn(token, user);
}
export const hydrateAuth = () => _useAuthStore.getState().hydrate();
