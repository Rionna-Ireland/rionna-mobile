import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { useCreatePost } from '@/features/community-posting/api/use-create-post';
import { uploadImage } from '@/features/community-posting/lib/upload-image';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));
jest.mock('@/features/community-posting/lib/upload-image', () => ({ uploadImage: jest.fn() }));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const mockUploadImage = uploadImage as jest.MockedFunction<typeof uploadImage>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

const IMAGE = {
  uri: 'file:///tmp/photo.jpg',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1234,
};

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCreatePost - success and validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips the upload and posts without imageKey when no image is given', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.create({ spaceId: 'space-1', body: 'hello' });
    });

    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('/api/community/posts', {
      organizationId: 'org-1',
      spaceId: 'space-1',
      title: undefined,
      body: 'hello',
      imageKey: undefined,
    });
    expect(outcome).toEqual({ ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } });
    expect(result.current.failure).toBeNull();
  });

  it('uploads the image first and posts with the returned imageKey', async () => {
    mockUploadImage.mockResolvedValue('orgs/org-1/posts/photo.jpg');
    mockPost.mockResolvedValue({ data: { ok: true, post: { circlePostId: 'p1', spaceId: 'space-1' } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    await act(async () => {
      await result.current.create({ spaceId: 'space-1', body: 'hello', image: IMAGE });
    });

    expect(mockUploadImage).toHaveBeenCalledWith(SCOPE, IMAGE);
    expect(mockPost).toHaveBeenCalledWith('/api/community/posts', {
      organizationId: 'org-1',
      spaceId: 'space-1',
      title: undefined,
      body: 'hello',
      imageKey: 'orgs/org-1/posts/photo.jpg',
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

  it('rejects an image over 10MB before making any request', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.create({
        spaceId: 'space-1',
        body: 'hello',
        image: { ...IMAGE, fileSize: 10 * 1024 * 1024 + 1 },
      });
    });

    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(outcome).toEqual({ ok: false, reason: 'image_failed' });
    expect(result.current.failure).toBe('image_failed');
  });
});

describe('useCreatePost - failure mapping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps an image upload failure to failure:"image_failed" without posting', async () => {
    mockUploadImage.mockRejectedValue(new Error('Image upload failed (403)'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
    const { result } = renderHook(() => useCreatePost(SCOPE), { wrapper: wrapper(queryClient) });

    let outcome;
    await act(async () => {
      outcome = await result.current.create({ spaceId: 'space-1', body: 'hello', image: IMAGE });
    });

    expect(mockUploadImage).toHaveBeenCalledWith(SCOPE, IMAGE);
    expect(mockPost).not.toHaveBeenCalled();
    expect(outcome).toEqual({ ok: false, reason: 'image_failed' });
    expect(result.current.failure).toBe('image_failed');
  });

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
