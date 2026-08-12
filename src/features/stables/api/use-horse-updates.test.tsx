import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useHorseUpdates } from '@/features/stables/api/use-horse-updates';
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

describe('useHorseUpdates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the published updates timeline for a horse', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 'update-1',
          updateType: 'wellbeing',
          title: 'All clear',
          bodyText: 'Routine checkup, all clear.',
          publishedAt: '2026-08-01T00:00:00.000Z',
          circlePostId: 'post-1',
        },
      ],
    });

    const { result } = renderHook(() => useHorseUpdates('horse-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/api/horses/horse-1/updates');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].updateType).toBe('wellbeing');
  });

  it('tolerates a missing/empty response body', async () => {
    mockGet.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useHorseUpdates('horse-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when horseId is undefined', () => {
    const { result } = renderHook(() => useHorseUpdates(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});
