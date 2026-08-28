import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) || null;
  }
  catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.remove(key);
}

export function removeItemsWithPrefix(prefix: string): void {
  const keys = storage.getAllKeys().filter(key => key.startsWith(prefix));
  keys.forEach(key => storage.remove(key));
}
