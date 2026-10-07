import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useMembership } from '@/features/settings/api/use-membership';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { get: jest.fn() } }));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMembership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the signed-in member\'s membership', async () => {
    const membership = { since: '2026-03-01T00:00:00.000Z', foundingMember: true, status: 'active' };
    mockGet.mockResolvedValue({ data: membership });
    const { result } = renderHook(() => useMembership('user-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/me/membership');
    expect(result.current.data).toEqual(membership);
  });

  it('does not fetch without a user', () => {
    renderHook(() => useMembership(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });
});
