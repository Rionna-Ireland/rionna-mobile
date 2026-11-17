import type { AxiosError } from 'axios';
import { QueryClient } from '@tanstack/react-query';

// M-17: 4xx won't change on retry (and a 401/403 must act once); only network errors and 5xx get 2 more tries.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as AxiosError | null)?.response?.status;
  return failureCount < 2 && (status === undefined || status >= 500);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: shouldRetry,
    },
  },
});
