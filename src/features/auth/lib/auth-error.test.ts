import { describeAuthError } from './auth-error';

jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('describeAuthError', () => {
  it('maps rejected credentials to per-form copy', () => {
    const rejected = { response: { status: 401, data: { message: 'INVALID_EMAIL_OR_PASSWORD' } } };
    expect(describeAuthError(rejected, 'signIn')).toBe('That email and password don’t match. Try again, or reset your password.');
    expect(describeAuthError({ response: { status: 400 } }, 'changePassword')).toBe('Your current password isn’t right. Try again.');
    expect(describeAuthError({ response: { status: 400 } }, 'deleteAccount')).toBe('That password isn’t right. Try again.');
  });

  it('maps rate limits, network failures and server errors, never the raw message', () => {
    expect(describeAuthError({ response: { status: 429 } }, 'signIn')).toBe('Too many attempts. Wait a minute and try again.');
    expect(describeAuthError({ message: 'Network Error', code: 'ERR_NETWORK' }, 'signIn')).toBe('You’re offline. Check your connection and try again.');
    expect(describeAuthError({ message: 'timeout of 10000ms exceeded', code: 'ECONNABORTED' }, 'signIn')).toBe('You’re offline. Check your connection and try again.');
    const server = describeAuthError({ response: { status: 500, data: { message: 'Prisma exploded' } } }, 'deleteAccount');
    expect(server).toBe('Something went wrong on our side. Try again in a moment.');
    expect(server).not.toContain('Prisma');
  });
});
