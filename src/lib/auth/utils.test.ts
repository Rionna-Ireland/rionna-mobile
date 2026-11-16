import * as SecureStore from 'expo-secure-store';

import { getItem, removeItem } from '@/lib/storage';

import { getToken, removeToken, setToken } from './utils';

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync('auth-token');
});

describe('auth token storage (M-01)', () => {
  it('keeps the token in SecureStore, not MMKV', () => {
    setToken('tok');
    expect(SecureStore.setItem).toHaveBeenCalledWith('auth-token', 'tok');
    expect(getToken()).toBe('tok');
    expect(getItem).not.toHaveBeenCalled();
  });

  it('moves a pre-S17-03 MMKV token into SecureStore once', () => {
    (getItem as jest.Mock).mockReturnValueOnce('legacy-tok');

    expect(getToken()).toBe('legacy-tok');
    expect(SecureStore.setItem).toHaveBeenCalledWith('auth-token', 'legacy-tok');
    expect(removeItem).toHaveBeenCalledWith('auth-token');
    expect(getToken()).toBe('legacy-tok'); // now served from SecureStore
  });

  it('removes the token from both stores', async () => {
    setToken('tok');
    removeToken();
    await Promise.resolve();
    expect(SecureStore.getItem('auth-token')).toBeNull();
    expect(removeItem).toHaveBeenCalledWith('auth-token');
  });
});
