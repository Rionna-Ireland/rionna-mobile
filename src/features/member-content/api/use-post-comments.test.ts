import type {
  MemberFeedItem,
  MemberPostDetail,
  PostComment,
} from '@/features/member-content/types';

import { QueryClient } from '@tanstack/react-query';

import {
  applyCommentCountDelta,
  fetchPostComments,
  removeCommentById,
  replaceCommentById,
  sendDeletePostComment,
  sendPostComment,
} from '@/features/member-content/api/use-post-comments';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  client: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function comment(overrides: Partial<PostComment> = {}): PostComment {
  return {
    id: 'c-1',
    parentCommentId: null,
    bodyText: 'Nice one',
    tiptapDoc: null,
    authorName: 'Jane',
    authorAvatarUrl: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    likeCount: 0,
    isLiked: false,
    canDelete: false,
    replies: [],
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('fetchPostComments', () => {
  it('reads the comments page from the backend proxy', async () => {
    mockGet.mockResolvedValue({
      data: { ok: true, comments: [comment()], hasNextPage: false, totalCount: 1 },
    });
    const page = await fetchPostComments(SCOPE, 'post-1');
    expect(page.comments).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith('/api/circle/post-comments', {
      params: { organizationId: 'org-1', postId: 'post-1', page: 1 },
    });
  });

  it('throws on ok:false so the screen shows unavailable', async () => {
    mockGet.mockResolvedValue({
      data: { ok: false, comments: [], hasNextPage: false, totalCount: null },
    });
    await expect(fetchPostComments(SCOPE, 'post-1')).rejects.toThrow('Comments unavailable');
  });
});

describe('sendPostComment', () => {
  it('posts the comment and returns the created record', async () => {
    const created = comment({ id: 'c-9', canDelete: true });
    mockPost.mockResolvedValue({ data: { ok: true, comment: created } });
    await expect(sendPostComment(SCOPE, { postId: 'post-1', body: 'Hi' })).resolves.toEqual(created);
    expect(mockPost).toHaveBeenCalledWith('/api/circle/post-comment', {
      organizationId: 'org-1',
      postId: 'post-1',
      body: 'Hi',
    });
  });

  it('resolves null when the write landed without a parseable comment', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, comment: null } });
    await expect(sendPostComment(SCOPE, { postId: 'post-1', body: 'Hi' })).resolves.toBeNull();
  });

  it('rejects on ok:false so the optimistic append rolls back', async () => {
    mockPost.mockResolvedValue({ data: { ok: false, comment: null } });
    await expect(sendPostComment(SCOPE, { postId: 'post-1', body: 'Hi' })).rejects.toThrow(
      'Comment failed',
    );
  });
});

describe('sendDeletePostComment', () => {
  it('posts the delete and resolves on ok', async () => {
    mockPost.mockResolvedValue({ data: { ok: true } });
    await expect(
      sendDeletePostComment(SCOPE, { postId: 'post-1', commentId: 'c-1' }),
    ).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith('/api/circle/post-comment-delete', {
      organizationId: 'org-1',
      postId: 'post-1',
      commentId: 'c-1',
    });
  });

  it('rejects on ok:false', async () => {
    mockPost.mockResolvedValue({ data: { ok: false } });
    await expect(
      sendDeletePostComment(SCOPE, { postId: 'post-1', commentId: 'c-1' }),
    ).rejects.toThrow('Comment delete failed');
  });
});

describe('replaceCommentById', () => {
  it('swaps the optimistic comment for the server one in place', () => {
    const list = [comment({ id: 'temp-1', bodyText: 'Hi' }), comment({ id: 'c-2' })];
    const next = replaceCommentById(list, 'temp-1', comment({ id: 'c-9', bodyText: 'Hi' }));
    expect(next.map(entry => entry.id)).toEqual(['c-9', 'c-2']);
  });

  it('returns the same array when the id is absent', () => {
    const list = [comment()];
    expect(replaceCommentById(list, 'nope', comment({ id: 'x' }))).toBe(list);
  });
});

describe('removeCommentById', () => {
  it('removes a top-level comment', () => {
    const list = [comment({ id: 'c-1' }), comment({ id: 'c-2' })];
    expect(removeCommentById(list, 'c-1').map(entry => entry.id)).toEqual(['c-2']);
  });

  it('removes a nested reply without touching its siblings', () => {
    const list = [
      comment({
        id: 'c-1',
        replies: [comment({ id: 'r-1', parentCommentId: 'c-1' }), comment({ id: 'r-2', parentCommentId: 'c-1' })],
      }),
    ];
    const next = removeCommentById(list, 'r-1');
    expect(next[0]?.replies.map(entry => entry.id)).toEqual(['r-2']);
  });

  it('returns the same array when the id is absent', () => {
    const list = [comment()];
    expect(removeCommentById(list, 'nope')).toBe(list);
  });
});

describe('applyCommentCountDelta', () => {
  const FEED_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'feed', 'org-1', 'member-1'];
  const POST_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'post', 'org-1', 'member-1', 'space-1', 'post-1'];

  function feedItem(overrides: Partial<MemberFeedItem> = {}): MemberFeedItem {
    return {
      id: 'post-1',
      spaceId: 'space-1',
      kind: 'post',
      title: 'Post',
      excerpt: null,
      createdAt: null,
      spaceName: 'Laska',
      authorName: 'Jane',
      commentCount: 2,
      likeCount: 3,
      isLiked: false,
      imageUrl: null,
      url: null,
      ...overrides,
    };
  }

  function postDetail(overrides: Partial<MemberPostDetail> = {}): MemberPostDetail {
    return {
      id: 'post-1',
      spaceId: 'space-1',
      title: 'Post',
      bodyHtml: null,
      bodyText: null,
      imageUrl: null,
      tiptapDoc: null,
      embeds: {},
      inlineAttachments: [],
      authorName: 'Jane',
      authorAvatarUrl: null,
      spaceName: 'Laska',
      createdAt: null,
      commentCount: 2,
      likeCount: 3,
      isLiked: false,
      url: null,
      ...overrides,
    };
  }

  function seededClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
    });
    queryClient.setQueryData(FEED_KEY, [feedItem(), feedItem({ id: 'post-2' })]);
    queryClient.setQueryData(POST_KEY, postDetail());
    return queryClient;
  }

  it('bumps the target post count in feed and detail caches, in place', () => {
    const queryClient = seededClient();
    applyCommentCountDelta(queryClient, 'post-1', 1);
    expect(queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY)?.[0]?.commentCount).toBe(3);
    expect(queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY)?.[1]?.commentCount).toBe(2);
    expect(queryClient.getQueryData<MemberPostDetail>(POST_KEY)?.commentCount).toBe(3);
  });

  it('never drops below zero and leaves untouched caches by reference', () => {
    const queryClient = seededClient();
    applyCommentCountDelta(queryClient, 'post-1', -5);
    expect(queryClient.getQueryData<MemberPostDetail>(POST_KEY)?.commentCount).toBe(0);
    const feedBefore = queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY);
    applyCommentCountDelta(queryClient, 'absent-post', 1);
    expect(queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY)).toBe(feedBefore);
  });
});
