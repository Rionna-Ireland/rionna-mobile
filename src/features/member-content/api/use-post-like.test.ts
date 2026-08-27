import type {
  InsideTrackResult,
  MemberFeedItem,
  MemberPostDetail,
} from '@/features/member-content/types';

import { QueryClient } from '@tanstack/react-query';

import {
  applyLikeToFeedItems,
  applyLikeToPostDetail,
  applyOptimisticLike,
  reconcileLikeCount,
  rollbackOptimisticLike,
  sendPostLike,
} from '@/features/member-content/api/use-post-like';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  client: { post: jest.fn() },
}));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

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
    commentCount: 0,
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
    commentCount: 0,
    likeCount: 3,
    isLiked: false,
    url: null,
    ...overrides,
  };
}

describe('sendPostLike', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the like intent to the backend proxy', async () => {
    mockPost.mockResolvedValue({ data: { ok: true, liked: true, likeCount: 4 } });

    await expect(sendPostLike(SCOPE, { postId: 'post-1', liked: true })).resolves.toEqual({
      ok: true,
      liked: true,
      likeCount: 4,
    });
    expect(mockPost).toHaveBeenCalledWith('/api/circle/post-like', {
      organizationId: 'org-1',
      postId: 'post-1',
      liked: true,
    });
  });

  it('rejects a failed envelope so the optimistic flip rolls back', async () => {
    mockPost.mockResolvedValue({ data: { ok: false, liked: true, likeCount: null } });
    await expect(sendPostLike(SCOPE, { postId: 'post-1', liked: true })).rejects.toThrow(
      'Post like failed',
    );
  });
});

describe('applyLikeToFeedItems', () => {
  it('flips isLiked and bumps the count on the target post only', () => {
    const items = [feedItem(), feedItem({ id: 'post-2', likeCount: 7 })];
    const next = applyLikeToFeedItems(items, 'post-1', true);
    expect(next[0]).toMatchObject({ isLiked: true, likeCount: 4 });
    expect(next[1]).toMatchObject({ isLiked: false, likeCount: 7 });
  });

  it('does not double-apply when the post is already in the desired state', () => {
    const items = [feedItem({ isLiked: true, likeCount: 4 })];
    expect(applyLikeToFeedItems(items, 'post-1', true)).toBe(items);
  });

  it('never drops the count below zero on unlike', () => {
    const items = [feedItem({ isLiked: true, likeCount: 0 })];
    const next = applyLikeToFeedItems(items, 'post-1', false);
    expect(next[0]).toMatchObject({ isLiked: false, likeCount: 0 });
  });
});

describe('applyLikeToPostDetail', () => {
  it('flips the detail payload when it is the target post', () => {
    expect(applyLikeToPostDetail(postDetail(), 'post-1', true)).toMatchObject({
      isLiked: true,
      likeCount: 4,
    });
  });

  it('leaves other posts untouched', () => {
    const other = postDetail({ id: 'post-9' });
    expect(applyLikeToPostDetail(other, 'post-1', true)).toBe(other);
  });
});

describe('optimistic cache update', () => {
  const FEED_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'feed', 'org-1', 'member-1'];
  const SPACE_FEED_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'space-feed', 'org-1', 'member-1', 'space-1'];
  const POST_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'post', 'org-1', 'member-1', 'space-1', 'post-1'];

  function seededClient() {
    // gcTime Infinity so no gc timers are scheduled — a pending timeout keeps
    // the jest worker alive after the suite finishes.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
    });
    queryClient.setQueryData(FEED_KEY, [feedItem(), feedItem({ id: 'post-2' })]);
    queryClient.setQueryData(SPACE_FEED_KEY, [feedItem()]);
    queryClient.setQueryData(POST_KEY, postDetail());
    return queryClient;
  }

  it('flips the post across merged feed, space feed, and post detail caches', () => {
    const queryClient = seededClient();
    applyOptimisticLike(queryClient, 'post-1', true);

    const feed = queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY);
    expect(feed?.[0]).toMatchObject({ isLiked: true, likeCount: 4 });
    expect(feed?.[1]).toMatchObject({ isLiked: false, likeCount: 3 });
    expect(queryClient.getQueryData<MemberFeedItem[]>(SPACE_FEED_KEY)?.[0]).toMatchObject({
      isLiked: true,
      likeCount: 4,
    });
    expect(queryClient.getQueryData<MemberPostDetail>(POST_KEY)).toMatchObject({
      isLiked: true,
      likeCount: 4,
    });
  });

  it('rolls every touched cache back to its snapshot on error', () => {
    const queryClient = seededClient();
    const snapshots = applyOptimisticLike(queryClient, 'post-1', true);
    rollbackOptimisticLike(queryClient, snapshots);

    expect(queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY)?.[0]).toMatchObject({
      isLiked: false,
      likeCount: 3,
    });
    expect(queryClient.getQueryData<MemberFeedItem[]>(SPACE_FEED_KEY)?.[0]).toMatchObject({
      isLiked: false,
      likeCount: 3,
    });
    expect(queryClient.getQueryData<MemberPostDetail>(POST_KEY)).toMatchObject({
      isLiked: false,
      likeCount: 3,
    });
  });

  it('does not snapshot caches the post does not appear in', () => {
    const queryClient = seededClient();
    const snapshots = applyOptimisticLike(queryClient, 'post-2', true);
    expect(snapshots.map(([key]) => key)).toEqual([FEED_KEY]);
  });

  describe('reconcileLikeCount', () => {
    it('writes the server count over the optimistic count in every cache', () => {
      const queryClient = seededClient();
      applyOptimisticLike(queryClient, 'post-1', true); // optimistic 3 -> 4
      reconcileLikeCount(queryClient, { postId: 'post-1', liked: true, likeCount: 9 }); // server says 9

      expect(queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY)?.[0]).toMatchObject({
        isLiked: true,
        likeCount: 9,
      });
      expect(queryClient.getQueryData<MemberFeedItem[]>(SPACE_FEED_KEY)?.[0]).toMatchObject({
        isLiked: true,
        likeCount: 9,
      });
      expect(queryClient.getQueryData<MemberPostDetail>(POST_KEY)).toMatchObject({
        isLiked: true,
        likeCount: 9,
      });
    });

    it('leaves other posts and matching counts untouched (same references)', () => {
      const queryClient = seededClient();
      applyOptimisticLike(queryClient, 'post-1', true);
      const feedBefore = queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY);
      reconcileLikeCount(queryClient, { postId: 'post-1', liked: true, likeCount: 4 }); // already 4 — no-op

      const feedAfter = queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY);
      expect(feedAfter).toBe(feedBefore);
      expect(feedAfter?.[1]).toMatchObject({ isLiked: false, likeCount: 3 });
    });

    it('is a no-op when the server did not return a count', () => {
      const queryClient = seededClient();
      applyOptimisticLike(queryClient, 'post-1', true);
      const feedBefore = queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY);
      reconcileLikeCount(queryClient, { postId: 'post-1', liked: true, likeCount: null });
      expect(queryClient.getQueryData<MemberFeedItem[]>(FEED_KEY)).toBe(feedBefore);
    });
  });
});

describe('inside track cache (pinned + latest arrays)', () => {
  const INSIDE_TRACK_KEY = [MEMBER_CONTENT_QUERY_ROOT, 'inside-track', 'org-1', 'member-1'];

  function insideTrackResult(overrides: Partial<InsideTrackResult> = {}): InsideTrackResult {
    return {
      ok: true,
      configured: true,
      pinned: [],
      latest: [],
      ...overrides,
    };
  }

  function seededInsideTrackClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
    });
    queryClient.setQueryData(
      INSIDE_TRACK_KEY,
      insideTrackResult({
        pinned: [feedItem({ id: 'pinned-1', likeCount: 2 })],
        latest: [feedItem({ id: 'post-1' }), feedItem({ id: 'post-2', likeCount: 7 })],
      }),
    );
    return queryClient;
  }

  it('applies an optimistic like to a post in the latest array', () => {
    const queryClient = seededInsideTrackClient();
    applyOptimisticLike(queryClient, 'post-1', true);

    const result = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    expect(result?.latest[0]).toMatchObject({ isLiked: true, likeCount: 4 });
    expect(result?.latest[1]).toMatchObject({ isLiked: false, likeCount: 7 });
    expect(result?.pinned[0]).toMatchObject({ isLiked: false, likeCount: 2 });
  });

  it('applies an optimistic like to a post in the pinned array', () => {
    const queryClient = seededInsideTrackClient();
    applyOptimisticLike(queryClient, 'pinned-1', true);

    const result = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    expect(result?.pinned[0]).toMatchObject({ isLiked: true, likeCount: 3 });
  });

  it('rolls back the Inside Track cache to its snapshot on error', () => {
    const queryClient = seededInsideTrackClient();
    const snapshots = applyOptimisticLike(queryClient, 'post-1', true);
    rollbackOptimisticLike(queryClient, snapshots);

    const result = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    expect(result?.latest[0]).toMatchObject({ isLiked: false, likeCount: 3 });
  });

  it('does not snapshot the Inside Track cache when the post is not in it', () => {
    const queryClient = seededInsideTrackClient();
    const snapshots = applyOptimisticLike(queryClient, 'not-in-inside-track', true);
    expect(snapshots).toEqual([]);
  });

  it('reconciles the server like count in the latest array', () => {
    const queryClient = seededInsideTrackClient();
    applyOptimisticLike(queryClient, 'post-1', true); // optimistic 3 -> 4
    reconcileLikeCount(queryClient, { postId: 'post-1', liked: true, likeCount: 9 });

    const result = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    expect(result?.latest[0]).toMatchObject({ isLiked: true, likeCount: 9 });
  });

  it('reconciles the server like count in the pinned array', () => {
    const queryClient = seededInsideTrackClient();
    applyOptimisticLike(queryClient, 'pinned-1', true); // optimistic 2 -> 3
    reconcileLikeCount(queryClient, { postId: 'pinned-1', liked: true, likeCount: 12 });

    const result = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    expect(result?.pinned[0]).toMatchObject({ isLiked: true, likeCount: 12 });
  });

  it('is a no-op (same reference) when nothing in the Inside Track cache changed', () => {
    const queryClient = seededInsideTrackClient();
    const before = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    reconcileLikeCount(queryClient, { postId: 'not-in-inside-track', liked: true, likeCount: 5 });
    const after = queryClient.getQueryData<InsideTrackResult>(INSIDE_TRACK_KEY);
    expect(after).toBe(before);
  });
});
