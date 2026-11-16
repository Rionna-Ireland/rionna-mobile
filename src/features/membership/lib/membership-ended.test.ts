import { router } from 'expo-router';

import { getAuthStatus, signOut } from '@/features/auth/use-auth-store';

import { client } from '@/lib/api/client';
import { isMembershipInactiveError, onMembershipEndedClosed } from './membership-ended';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/auth/use-auth-store', () => ({
  getAuthStatus: jest.fn(() => 'signIn'),
  signOut: jest.fn(),
}));

// S17-02 wire shape: oRPC OpenAPI error JSON for ORPCError('FORBIDDEN', { data: { reason } }).
const inactiveBody = {
  defined: false,
  code: 'FORBIDDEN',
  status: 403,
  message: 'Forbidden',
  data: { reason: 'membership_inactive' },
};

function respondWith(status: number, data: unknown) {
  client.defaults.adapter = config => Promise.reject(Object.assign(new Error(`HTTP ${status}`), { config, response: { status, data } }));
}

describe('membership_inactive handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onMembershipEndedClosed();
    (getAuthStatus as jest.Mock).mockReturnValue('signIn');
  });

  it('recognises only a 403 with reason membership_inactive', () => {
    expect(isMembershipInactiveError({ response: { status: 403, data: inactiveBody } })).toBe(true);
    expect(isMembershipInactiveError({ response: { status: 403, data: { code: 'FORBIDDEN' } } })).toBe(false);
    expect(isMembershipInactiveError({ response: { status: 401, data: inactiveBody } })).toBe(false);
    expect(isMembershipInactiveError(new Error('network'))).toBe(false);
    expect(isMembershipInactiveError(null)).toBe(false);
  });

  it('routes to the ended screen once when several content requests 403 together, and never signs out', async () => {
    respondWith(403, inactiveBody);

    const results = await Promise.allSettled(
      ['/api/horses', '/api/polls', '/api/inbox', '/api/feed'].map(url => client.get(url)),
    );

    expect(results.every(r => r.status === 'rejected')).toBe(true);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/membership-ended');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('routes again after the ended screen closes', async () => {
    respondWith(403, inactiveBody);
    await client.get('/api/horses').catch(() => {});
    onMembershipEndedClosed();
    await client.get('/api/horses').catch(() => {});

    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('ignores other 403s and lapses seen before sign-in completes', async () => {
    respondWith(403, { code: 'FORBIDDEN', status: 403 });
    await client.get('/api/admin').catch(() => {});
    respondWith(403, inactiveBody);
    (getAuthStatus as jest.Mock).mockReturnValue('signOut');
    await client.get('/api/horses').catch(() => {});

    expect(router.push).not.toHaveBeenCalled();
  });
});
