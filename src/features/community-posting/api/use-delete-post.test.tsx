import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as React from 'react';

import { useDeletePost } from '@/features/community-posting/api/use-delete-post';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDeletePost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the delete request and resolves true on ok:true, invalidating member-content', async () => {
    mockPost.mockResolvedValue({ data: { ok: true } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeletePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.remove({ spaceId: 'space-1', postId: 'post-1' });
    });

    expect(mockPost).toHaveBeenCalledWith('/api/community/posts/delete', {
      organizationId: 'org-1',
      spaceId: 'space-1',
      postId: 'post-1',
    });
    expect(outcome).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
  });

  it('resolves false when the backend reports ok:false', async () => {
    mockPost.mockResolvedValue({ data: { ok: false } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useDeletePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.remove({ spaceId: 'space-1', postId: 'post-1' });
    });
    expect(outcome).toBe(false);
  });

  it('resolves false on a network error instead of throwing', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useDeletePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.remove({ spaceId: 'space-1', postId: 'post-1' });
    });
    expect(outcome).toBe(false);
  });
});
