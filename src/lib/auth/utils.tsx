import type * as SecureStoreType from 'expo-secure-store';

import { getItem, removeItem, setItem } from '@/lib/storage';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';

export type TokenType = string;

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  lastActiveOrganizationId?: string | null;
};

// M-01: the bearer token lives in Keychain / Keystore, not plain MMKV.
// Required lazily (native module, house rule: no top-level access).
function secureStore(): typeof SecureStoreType {
  return require('expo-secure-store');
}

/** Read once at hydrate; requests use the zustand copy. */
export function getToken(): TokenType | null {
  const token = secureStore().getItem(TOKEN_KEY);
  if (token)
    return token;
  // One-time migration for installs from before S17-03 (token in MMKV).
  const legacy = getItem<TokenType>(TOKEN_KEY);
  if (legacy) {
    secureStore().setItem(TOKEN_KEY, legacy);
    void removeItem(TOKEN_KEY);
  }
  return legacy;
}

export function setToken(value: TokenType): void {
  secureStore().setItem(TOKEN_KEY, value);
}

/** Never throws: sign-out and hydrate must always reach 'signOut'. */
export function removeToken(): void {
  try {
    void secureStore().deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
  catch {}
  Promise.resolve(removeItem(TOKEN_KEY)).catch(() => {});
}

export function getUser(): AuthUser | null {
  return getItem<AuthUser>(USER_KEY);
}

export function setUser(value: AuthUser): void {
  setItem<AuthUser>(USER_KEY, value);
}

export function removeUser(): void {
  removeItem(USER_KEY);
}
