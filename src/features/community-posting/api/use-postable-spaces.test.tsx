import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { usePostableSpaces } from '@/features/community-posting/api/use-postable-spaces';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { get: jest.fn() } }));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(() => null), setItem: jest.fn() }));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('usePostableSpaces', () => {
  it('fetches postable spaces for the club', async () => {
    const spaces = [{ id: 'space-1', name: 'Laska', emoji: '🐎', isHorse: true }];
    mockGet.mockResolvedValue({ data: { ok: true, spaces } });
    const { result } = renderHook(() => usePostableSpaces(SCOPE), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/community/postable-spaces', {
      params: { organizationId: 'org-1' },
    });
    expect(result.current.data).toEqual({ ok: true, spaces });
  });

  it('errors when the backend reports ok:false', async () => {
    mockGet.mockResolvedValue({ data: { ok: false, spaces: [] } });
    const { result } = renderHook(() => usePostableSpaces(SCOPE), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
