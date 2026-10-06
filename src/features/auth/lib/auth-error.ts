import { translate } from '@/lib/i18n';

/** Which form failed: decides the copy for a rejected password (401/400). */
export type AuthErrorContext = 'signIn' | 'changePassword' | 'deleteAccount';

const CREDENTIALS_KEY = {
  signIn: 'auth.errors.signInCredentials',
  changePassword: 'auth.errors.changePasswordCredentials',
  deleteAccount: 'auth.errors.deleteAccountCredentials',
} as const satisfies Record<AuthErrorContext, string>;

type AxiosLikeError = {
  response?: { status?: number; data?: unknown };
  code?: string;
  message?: string;
};

/**
 * Human, translated copy for a failed auth request (S14-08 A-007). The
 * server's own message (`response.data.message`, "Sign in failed (500)",
 * "timeout of 10000ms exceeded", the API host) never reaches the UI; it's
 * logged in development only.
 */
export function describeAuthError(error: unknown, context: AuthErrorContext): string {
  const e = (error ?? {}) as AxiosLikeError;
  const status = e.response?.status;
  if (__DEV__)
    console.warn(`[auth] ${context} failed`, status ?? e.code ?? e.message, e.response?.data);
  if (!status)
    return translate('auth.errors.offline');
  if (status === 429)
    return translate('auth.errors.tooManyAttempts');
  if (status === 400 || status === 401 || status === 403)
    return translate(CREDENTIALS_KEY[context]);
  return translate('auth.errors.server');
}
