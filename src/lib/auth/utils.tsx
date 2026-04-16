import { getItem, removeItem, setItem } from '@/lib/storage';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';

export type TokenType = string;

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export function getToken(): TokenType | null {
  return getItem<TokenType>(TOKEN_KEY);
}

export function setToken(value: TokenType): void {
  setItem<TokenType>(TOKEN_KEY, value);
}

export function removeToken(): void {
  removeItem(TOKEN_KEY);
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
