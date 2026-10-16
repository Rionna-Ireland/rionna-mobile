import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useCreatePost } from '@/features/community-posting/api/use-create-post';
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

describe('useCreatePost - success and validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts without media when none is given', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.create({ spaceId: 'space-1', body: 'hello' });
    });

    expect(mockPost).toHaveBeenCalledWith('/api/community/posts', {
      organizationId: 'org-1',
      spaceId: 'space-1',
      title: undefined,
      body: 'hello',
      media: undefined,
    });
    expect(outcome).toEqual({ ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } });
    expect(result.current.failure).toBeNull();
  });

  it('sends media tokens in strip order', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    await act(async () => {
      await result.current.create({ spaceId: 'space-1', body: 'hello', media: [{ mediaToken: 't1' }, { mediaToken: 't2' }] });
    });

    expect(mockPost).toHaveBeenCalledWith('/api/community/posts', {
      organizationId: 'org-1',
      spaceId: 'space-1',
      title: undefined,
      body: 'hello',
      media: [{ mediaToken: 't1' }, { mediaToken: 't2' }],
    });
  });

  it('maps an ok:false response to failure without throwing', async () => {
    mockPost.mockResolvedValue({ data: { ok: false, reason: 'blocked' } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.create({ spaceId: 'space-1', body: 'hello' });
    });

    expect(outcome).toEqual({ ok: false, reason: 'blocked' });
    expect(result.current.failure).toBe('blocked');
  });
});

describe('useCreatePost - failure mapping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps a network error to failure:"network" and resolves null', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.create({ spaceId: 'space-1', body: 'hello' });
    });

    expect(outcome).toBeNull();
    expect(result.current.failure).toBe('network');
  });

  it('invalidates member-content queries on success', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    await act(async () => {
      await result.current.create({ spaceId: 'space-1', body: 'hello' });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
    });
  });
});
