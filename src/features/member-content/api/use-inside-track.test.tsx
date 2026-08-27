import type { MemberFeedItem } from '@/features/member-content/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useInsideTrack } from '@/features/member-content/api/use-inside-track';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function feedItem(overrides: Partial<MemberFeedItem> = {}): MemberFeedItem {
  return {
    id: 'post-1',
    spaceId: 'space-1',
    kind: 'post',
    title: 'Post',
    excerpt: null,
    createdAt: null,
    spaceName: 'Inside Track',
    authorName: 'Jane',
    commentCount: 0,
    likeCount: 0,
    isLiked: false,
    imageUrl: null,
    url: null,
    ...overrides,
  };
}

describe('useInsideTrack', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches and returns pinned + latest', async () => {
    const item1 = feedItem({ id: 'pinned-1' });
    const item2 = feedItem({ id: 'latest-1' });
    mockGet.mockResolvedValue({
      data: { ok: true, configured: true, pinned: [item1], latest: [item2] },
    });

    const { result } = renderHook(() => useInsideTrack(SCOPE), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/api/circle/inside-track', {
      params: { organizationId: 'org-1' },
    });
    expect(result.current.data?.pinned[0]?.id).toBe(item1.id);
    expect(result.current.data?.latest[0]?.id).toBe(item2.id);
    expect(result.current.contentState).toBe('fresh');
  });

  it('is empty when configured with no posts', async () => {
    mockGet.mockResolvedValue({
      data: { ok: true, configured: true, pinned: [], latest: [] },
    });

    const { result } = renderHook(() => useInsideTrack(SCOPE), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.contentState).toBe('empty');
  });

  it('is unavailable on ok:false', async () => {
    mockGet.mockResolvedValue({
      data: { ok: false, configured: false, pinned: [], latest: [] },
    });

    const { result } = renderHook(() => useInsideTrack(SCOPE), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.contentState).toBe('unavailable');
  });
});
