import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { hydrateAuth, signOut, useAuthStore } from '@/features/auth/use-auth-store';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { getItem } from '@/lib/storage';

jest.mock('env', () => ({
  __esModule: true,
  default: { EXPO_PUBLIC_CLUB_ID: 'org-1', EXPO_PUBLIC_API_URL: 'https://api.test' },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[device]' })),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  removeItemsWithPrefix: jest.fn(),
}));
jest.mock('@/lib/auth/mobile-org-bootstrap', () => ({
  bootstrapMobileOrganization: jest.fn(() => Promise.resolve()),
}));

type Call = { method: string; url: string; authorization?: string; timeout?: number };
let calls: Call[] = [];
let respond: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown } | Error;

const adapter: AxiosAdapter = async (config) => {
  calls.push({
    method: (config.method ?? 'get').toUpperCase(),
    url: config.url ?? '',
    authorization: config.headers?.Authorization as string | undefined,
    timeout: config.timeout,
  });
  const result = respond(config);
  if (result instanceof Error)
    throw Object.assign(result, { config });
  const response = { data: result.data ?? {}, status: result.status, statusText: '', headers: {}, config };
  if (result.status >= 400)
    throw Object.assign(new Error(`HTTP ${result.status}`), { config, response });
  return response;
};

const signOutCalls = () => calls.filter(c => c.method === 'POST' && c.url === '/api/auth/sign-out');
const unregisterCalls = () => calls.filter(c => c.method === 'POST' && c.url === '/api/push/unregister');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function signInAs(token: string) {
  (getItem as jest.Mock).mockImplementation(key => (key === 'auth-token' ? token : null));
  useAuthStore.setState({ status: 'signIn', token, user: { id: 'member-a', email: 'a@example.com' } });
}

beforeEach(() => {
  jest.clearAllMocks();
  (getItem as jest.Mock).mockImplementation(() => null);
  calls = [];
  respond = () => ({ status: 200 });
  client.defaults.adapter = adapter;
  queryClient.clear();
  useAuthStore.setState({ status: 'idle', token: null, user: null });
});

// Seeded queries hold 30 min gc timers; drop them so Jest can exit.
afterAll(() => queryClient.clear());

describe('hydrate', () => {
  it('with no stored token goes straight to signOut and makes no network calls', async () => {
    hydrateAuth();

    expect(useAuthStore.getState().status).toBe('signOut');
    await flush();
    expect(calls).toEqual([]);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});

describe('hydrate with a stored token (M-01)', () => {
  it('signs in from SecureStore and sends that token from memory', async () => {
    SecureStore.setItem('auth-token', 'token-a');
    (getItem as jest.Mock).mockImplementation(key => (key === 'auth-user' ? { id: 'member-a', email: 'a@example.com' } : null));

    hydrateAuth();
    await client.get('/api/me/membership');

    expect(useAuthStore.getState().status).toBe('signIn');
    expect(calls.at(-1)?.authorization).toBe('Bearer token-a');
    await SecureStore.deleteItemAsync('auth-token');
  });

  it('keeps a pre-S17-03 member (MMKV token + user) signed in, moving the token to SecureStore', async () => {
    const user = { id: 'member-a', email: 'a@example.com' };
    (getItem as jest.Mock).mockImplementation(key => (key === 'auth-token' ? 'legacy-a' : key === 'auth-user' ? user : null));

    hydrateAuth();
    await client.get('/api/me/membership');

    expect(useAuthStore.getState()).toMatchObject({ status: 'signIn', token: 'legacy-a', user });
    expect(SecureStore.getItem('auth-token')).toBe('legacy-a');
    expect(calls.at(-1)?.authorization).toBe('Bearer legacy-a');
    await SecureStore.deleteItemAsync('auth-token');
  });

  it('ends at signOut with no network when SecureStore cannot be read', async () => {
    (SecureStore.getItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error('keystore invalidated');
    });

    hydrateAuth();
    await flush();

    expect(useAuthStore.getState().status).toBe('signOut');
    expect(calls).toEqual([]);
  });

  it('treats a Keychain token without a user (iOS reinstall) as signed out', async () => {
    SecureStore.setItem('auth-token', 'leftover');

    hydrateAuth();
    await flush();

    expect(useAuthStore.getState().status).toBe('signOut');
    expect(SecureStore.getItem('auth-token')).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe('401 tear-down', () => {
  it('signs out exactly once when six requests 401 together, and still unregisters push', async () => {
    signInAs('token-a');
    respond = config => (config.url?.startsWith('/api/content') ? { status: 401 } : { status: 200 });

    await Promise.allSettled(Array.from({ length: 6 }, (_, i) => client.get(`/api/content/${i}`)));
    await signOut(); // joins the in-flight sign-out
    await flush();

    expect(signOutCalls()).toHaveLength(1);
    expect(unregisterCalls()).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe('signOut');
  });

  it('ignores a late 401 for a token that is no longer current', async () => {
    signInAs('token-a');
    respond = (config) => {
      if (config.url !== '/api/content/slow')
        return { status: 200 };
      signInAs('token-b'); // password change / account switch lands meanwhile
      return { status: 401 };
    };

    await client.get('/api/content/slow').catch(() => {});
    await flush();

    expect(calls[0].authorization).toBe('Bearer token-a');
    expect(signOutCalls()).toHaveLength(0);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signIn', token: 'token-b' });
  });

  it('does not sign out on a 401 from the login request', async () => {
    useAuthStore.setState({ status: 'signOut' });
    respond = () => ({ status: 401 });

    await client.post('/api/auth/sign-in/email', { email: 'a@example.com', password: 'x' }).catch(() => {});
    await flush();

    expect(signOutCalls()).toHaveLength(0);
    expect(unregisterCalls()).toHaveLength(0);
  });
});

describe('signOut', () => {
  it('ends the server session with the bearer token before dropping it', async () => {
    signInAs('token-a');

    await signOut();

    expect(signOutCalls()).toEqual([{ method: 'POST', url: '/api/auth/sign-out', authorization: 'Bearer token-a', timeout: 5000 }]);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signOut', token: null, user: null });
  });

  it('still completes when the server sign-out fails', async () => {
    signInAs('token-a');
    respond = config => (config.url === '/api/auth/sign-out' ? new Error('Network Error') : { status: 200 });

    await signOut();

    expect(signOutCalls()).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe('signOut');
  });

  it('bounds every sign-out network step so a bad network cannot hang it', async () => {
    signInAs('token-a');
    jest.useFakeTimers();
    try {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
      const done = signOut();
      await jest.advanceTimersByTimeAsync(5000);
      await done;
    }
    finally {
      jest.useRealTimers();
    }

    expect(useAuthStore.getState().status).toBe('signOut');
    expect(signOutCalls()[0].timeout).toBe(5000);

    calls = [];
    signInAs('token-a');
    await signOut();
    expect(unregisterCalls()[0].timeout).toBe(5000);
  });

  it('still ends at signOut when removing the token throws', async () => {
    signInAs('token-a');
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('keystore unavailable');
    });

    await signOut();

    expect(useAuthStore.getState()).toMatchObject({ status: 'signOut', token: null, user: null });
  });

  it('signs out (unmounting screens) before clearing caches, so nothing refetches with the old token', async () => {
    signInAs('token-a');
    let stateAtClear: unknown;
    const clear = jest.spyOn(queryClient, 'clear').mockImplementationOnce(() => {
      stateAtClear = { status: useAuthStore.getState().status, token: useAuthStore.getState().token };
    });

    await signOut();
    clear.mockRestore();

    expect(stateAtClear).toEqual({ status: 'signOut', token: null });
  });

  it('leaves no query cache or scheduled reminders behind', async () => {
    signInAs('token-a');
    queryClient.setQueryData(['horses', 'following'], [{ id: 'h1' }]);
    queryClient.setQueryData(['polls', 'active'], [{ myVoteOptionId: 'o1' }]);
    queryClient.setQueryData(['user', 'preferences'], { racing: true });

    await signOut();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });
});
