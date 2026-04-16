import type { AuthUser, TokenType } from '@/lib/auth/utils';

import { create } from 'zustand';
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
  signOut: () => void;
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

export const signOut = () => _useAuthStore.getState().signOut();
export function signIn(token: TokenType, user: AuthUser) {
  return _useAuthStore.getState().signIn(token, user);
}
export const hydrateAuth = () => _useAuthStore.getState().hydrate();
