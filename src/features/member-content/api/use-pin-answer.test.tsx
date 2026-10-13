import type { PostComment, PostCommentsPage } from '@/features/member-content/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { showErrorMessage } from '@/components/ui/utils';
import { applyPin, commentsQueryKey, sendPin, usePinAnswer } from '@/features/member-content/api/use-post-comments';
import { client } from '@/lib/api/client';
import { haptics } from '@/lib/motion';

jest.mock('@/lib/api/client', () => ({ client: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('@/components/ui/utils', () => ({ showErrorMessage: jest.fn() }));
jest.mock('@/lib/motion', () => ({ haptics: { success: jest.fn() } }));

const mockPost = client.post as jest.Mock;
const mockDelete = client.delete as jest.Mock;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function c(id: string, createdAt: string, replies: PostComment[] = []): PostComment {
  return { id, parentCommentId: null, bodyText: id, tiptapDoc: null, authorName: id, authorAvatarUrl: null, createdAt, likeCount: 0, isLiked: false, canDelete: false, replies };
}
function page(over: Partial<PostCommentsPage> = {}): PostCommentsPage {
  return {
    ok: true,
    comments: [c('a', '2026-07-01T00:00:00Z'), c('b', '2026-07-02T00:00:00Z', [c('r', '2026-07-03T00:00:00Z')])],
    hasNextPage: false,
    totalCount: 3,
    pinnedAnswer: null,
    canPin: true,
    ...over,
  };
}

describe('applyPin', () => {
  it('moves the comment out of the list into the pinned slot (no duplicate)', () => {
    const next = applyPin(page(), 'b');
    expect(next.pinnedAnswer?.id).toBe('b');
    expect(next.comments.map(x => x.id)).toEqual(['a']);
    expect(next.pinnedAnswer?.replies.map(r => r.id)).toEqual(['r']);
  });

  it('re-pinning swaps: the old pin returns to the list in order', () => {
    const next = applyPin(page({ pinnedAnswer: c('p', '2026-06-01T00:00:00Z') }), 'a');
    expect(next.pinnedAnswer?.id).toBe('a');
    expect(next.comments.map(x => x.id)).toEqual(['p', 'b']);
  });

  it('unpin returns the answer to the list', () => {
    const next = applyPin(page({ pinnedAnswer: c('p', '2026-07-01T12:00:00Z') }), null);
    expect(next.pinnedAnswer).toBeNull();
    expect(next.comments.map(x => x.id)).toEqual(['a', 'p', 'b']);
  });

  it('is a no-op for an unknown comment', () => {
    const p = page();
    expect(applyPin(p, 'zzz')).toBe(p);
  });
});

describe('sendPin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pOSTs the comment id and DELETEs with the org', async () => {
    await sendPin(SCOPE, { postId: 'p1', commentId: 'c1' });
    expect(mockPost).toHaveBeenCalledWith('/api/community/posts/p1/pinned-answer', { organizationId: 'org-1', commentId: 'c1' });
    await sendPin(SCOPE, { postId: 'p1', commentId: null });
    expect(mockDelete).toHaveBeenCalledWith('/api/community/posts/p1/pinned-answer', { data: { organizationId: 'org-1' } });
  });
});

describe('usePinAnswer', () => {
  function setup() {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    queryClient.setQueryData(commentsQueryKey(SCOPE, 'p1'), page());
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const utils = renderHook(() => usePinAnswer(SCOPE), { wrapper });
    return { queryClient, utils };
  }

  beforeEach(() => jest.clearAllMocks());

  it('updates optimistically, fires one success haptic', async () => {
    mockPost.mockResolvedValue({ data: { ok: true } });
    const { queryClient, utils } = setup();
    await act(async () => {
      utils.result.current.mutate({ postId: 'p1', commentId: 'a' });
    });
    await waitFor(() => expect(haptics.success).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryData<PostCommentsPage>(commentsQueryKey(SCOPE, 'p1'))?.pinnedAnswer?.id).toBe('a');
    expect(showErrorMessage).not.toHaveBeenCalled();
  });

  it('rolls back and shows the house error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('403'));
    const { queryClient, utils } = setup();
    await act(async () => {
      utils.result.current.mutate({ postId: 'p1', commentId: 'a' });
    });
    await waitFor(() => expect(showErrorMessage).toHaveBeenCalledTimes(1));
    const data = queryClient.getQueryData<PostCommentsPage>(commentsQueryKey(SCOPE, 'p1'));
    expect(data?.pinnedAnswer).toBeNull();
    expect(data?.comments.map(x => x.id)).toEqual(['a', 'b']);
    expect(haptics.success).not.toHaveBeenCalled();
  });
});
