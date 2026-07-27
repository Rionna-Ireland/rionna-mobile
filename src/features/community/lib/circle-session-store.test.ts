import type { CachedCircleSession } from './circle-session-store';
// In-memory MMKV-backed storage mock so the cache round-trips in tests.
// Mirrors the @/lib/storage helpers (getItem/setItem/removeItem), which wrap
// the single shared MMKV instance from src/lib/storage.tsx.
import {

  clearCachedCircleSession,
  getCachedCircleSession,
  isCircleSessionFresh,
  setCachedCircleSession,
} from './circle-session-store';

const mockStore = new Map<string, string>();

jest.mock(
  '@/lib/storage',
  () => ({
    getItem: jest.fn(<T>(key: string):
                          T | null => {
      const value = mockStore.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }),
    setItem: jest.fn(
      <T>(key: string, value: T) => { mockStore.set(key, JSON.stringify(value)); },
    ),
    removeItem: jest.fn((key: string) => { mockStore.delete(key); }),
  }),
);

describe('circle-session-store', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('returns null and false when nothing is cached', () => {
    expect(getCachedCircleSession()).toBeNull();
    expect(isCircleSessionFresh(null)).toBe(false);
  });

  it('round-trips a cached session and reports it fresh', () => {
    const now = Date.parse('2026-06-10T12:00:00.000Z');
    const session: CachedCircleSession = {
      accessToken: 'a',
      expiresAt:
              new Date(now + 2 * 60 * 60 * 1000).toISOString(), // 2h future
    };

    setCachedCircleSession(session);

    expect(getCachedCircleSession()).toEqual(session);
    expect(isCircleSessionFresh(session, now)).toBe(true);
  });

  it('treats a session expiring within the default skew as not fresh', () => {
    const now = Date.parse('2026-06-10T12:00:00.000Z');
    const session: CachedCircleSession = {
      accessToken: 'a',
      expiresAt:
              new Date(now + 30 * 1000).toISOString(), // 30s future, < 60s skew
    };

    setCachedCircleSession(session);

    expect(isCircleSessionFresh(session, now)).toBe(false);
  });

  it('returns null after clearing the cache', () => {
    setCachedCircleSession({
      accessToken: 'a',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    clearCachedCircleSession();

    expect(getCachedCircleSession()).toBeNull();
  });

  it('returns null when the stored value is unparseable', () => {
    mockStore.set('circle.session.v1', '{not json');
    expect(getCachedCircleSession()).toBeNull();
  });
});
