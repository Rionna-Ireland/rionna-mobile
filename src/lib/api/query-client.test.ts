import { AxiosError } from 'axios';

import { shouldRetry } from '@/lib/api/query-client';

function httpError(status: number) {
  return new AxiosError('fail', undefined, undefined, undefined, { status } as never);
}

describe('shouldRetry', () => {
  it('does not retry a 404', () => {
    expect(shouldRetry(0, httpError(404))).toBe(false);
  });

  it('does not retry a 403 (membership ended must route once)', () => {
    expect(shouldRetry(0, httpError(403))).toBe(false);
  });

  it('retries a network error twice, then stops', () => {
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(shouldRetry(0, networkError)).toBe(true);
    expect(shouldRetry(1, networkError)).toBe(true);
    expect(shouldRetry(2, networkError)).toBe(false);
  });

  it('retries a 5xx', () => {
    expect(shouldRetry(0, httpError(503))).toBe(true);
  });
});
