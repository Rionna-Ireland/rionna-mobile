import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useFollowedHorses } from '@/features/stables/api/use-followed-horses';
import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

jest.mock('env', () => ({
  __esModule: true,
  default: { EXPO_PUBLIC_CLUB_ID: 'org-1' },
}));

jest.mock('@/lib/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useFollowedHorses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the followed horses scoped to the active club', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'horse-1', isFollowing: true }] });

    const { result } = renderHook(() => useFollowedHorses(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/api/horses/following', {
      params: { organizationId: 'org-1' },
    });
    expect(result.current.data).toEqual([{ id: 'horse-1', isFollowing: true }]);
  });

  it('shares the STABLES_QUERY_ROOT constant used by the follow cache helpers', () => {
    // use-horse-follow.ts partial-matches queryKey: [STABLES_QUERY_ROOT] to
    // reach this hook's cache entry — this asserts the root value it relies
    // on hasn't drifted.
    expect(STABLES_QUERY_ROOT).toBe('horses');
  });
});
