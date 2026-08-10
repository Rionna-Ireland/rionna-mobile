import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useHorseWellbeing } from '@/features/stables/api/use-horse-wellbeing';
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

describe('useHorseWellbeing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the published wellbeing timeline for a horse', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 'wb-1',
          horseId: 'horse-1',
          organizationId: 'org-1',
          type: 'VET',
          body: 'Routine checkup, all clear.',
          publishedAt: '2026-08-01T00:00:00.000Z',
          notifyMembers: true,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });

    const { result } = renderHook(() => useHorseWellbeing('horse-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/api/horses/horse-1/wellbeing');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].type).toBe('VET');
  });

  it('tolerates a missing/empty response body', async () => {
    mockGet.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useHorseWellbeing('horse-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when horseId is undefined', () => {
    const { result } = renderHook(() => useHorseWellbeing(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});
