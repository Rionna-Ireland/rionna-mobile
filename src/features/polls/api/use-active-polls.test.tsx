import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useActivePolls } from '@/features/polls/api/use-active-polls';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { get: jest.fn() } }));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(() => null), setItem: jest.fn() }));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useActivePolls', () => {
  it('fetches active polls for the club', async () => {
    mockGet.mockResolvedValue({ data: { ok: true, polls: [] } });
    const { result } = renderHook(() => useActivePolls(SCOPE), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/polls/active', { params: { organizationId: 'org-1' } });
    expect(result.current.data).toEqual({ ok: true, polls: [] });
  });
  it('errors when the backend reports ok:false', async () => {
    mockGet.mockResolvedValue({ data: { ok: false, polls: [] } });
    const { result } = renderHook(() => useActivePolls(SCOPE), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
