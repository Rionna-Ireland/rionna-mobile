import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useTrainerUpdates } from '@/features/pulse/api/use-trainer-updates';
import { client } from '@/lib/api/client';

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

describe('useTrainerUpdates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the latest trainer updates from the member-posts endpoint', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 'mp-1',
          horseId: 'horse-1',
          horseName: 'Storm Chaser',
          title: 'Great work this week',
          bodyText: 'Going well.',
          publishedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });

    const { result } = renderHook(() => useTrainerUpdates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/api/member-posts/trainer-updates', {
      params: { organizationId: expect.any(String), limit: 3 },
    });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].horseName).toBe('Storm Chaser');
  });

  it('tolerates a missing/empty response body', async () => {
    mockGet.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useTrainerUpdates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
