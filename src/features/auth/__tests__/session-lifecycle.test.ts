import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import * as Notifications from 'expo-notifications';

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
jest.mock('@/features/community/lib/circle-cookie-clear', () => ({
  clearCircleWebViewCookies: jest.fn(() => Promise.resolve('cleared')),
}));

type Call = { method: string; url: string; authorization?: string };
let calls: Call[] = [];
let respond: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown } | Error;

const adapter: AxiosAdapter = async (config) => {
  calls.push({
    method: (config.method ?? 'get').toUpperCase(),
    url: config.url ?? '',
    authorization: config.headers?.Authorization as string | undefined,
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

    expect(signOutCalls()).toEqual([{ method: 'POST', url: '/api/auth/sign-out', authorization: 'Bearer token-a' }]);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signOut', token: null, user: null });
  });

  it('still completes when the server sign-out fails', async () => {
    signInAs('token-a');
    respond = config => (config.url === '/api/auth/sign-out' ? new Error('Network Error') : { status: 200 });

    await signOut();

    expect(signOutCalls()).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe('signOut');
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
