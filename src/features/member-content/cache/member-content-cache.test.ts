import {
  clearMemberContentCache,
  getCachedMemberFeed,
  getCachedMemberPost,
  setCachedMemberFeed,
  setCachedMemberPost,
} from '@/features/member-content/cache/member-content-cache';

const mockStore = new Map<string, unknown>();

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn((key: string) => mockStore.get(key) ?? null),
  setItem: jest.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
  }),
  removeItem: jest.fn((key: string) => {
    mockStore.delete(key);
  }),
}));

const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };
const OTHER_SCOPE = { organizationId: 'org-1', memberId: 'member-2' };
const NOW = Date.parse('2026-07-13T12:00:00.000Z');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const FEED_ITEM = {
  id: 'post-1',
  spaceId: 'space-1',
  kind: 'post' as const,
  title: 'Morning update',
  excerpt: 'Laska worked well.',
  createdAt: '2026-07-13T10:00:00.000Z',
  spaceName: 'Laska',
  authorName: 'Jane',
  commentCount: 2,
  likeCount: 4,
  isLiked: false,
  imageUrl: null,
  url: null,
};

const POLL_FEED_ITEM = {
  ...FEED_ITEM,
  id: 'poll:p1',
  spaceId: null,
  kind: 'poll' as const,
  title: 'Which charity?',
  poll: {
    id: 'p1',
    question: 'Which charity?',
    scope: 'club' as const,
    circleSpaceId: null,
    status: 'open' as const,
    publishedAt: '2026-07-13T09:00:00.000Z',
    closesAt: null,
    options: [{ id: 'o1', label: 'A', sortOrder: 0 }],
    myVoteOptionId: null,
    results: null,
  },
};

function postLocator(postId: string) {
  return { ...SCOPE, spaceId: 'space-1', postId };
}

function postDetail(id: string) {
  return {
    id,
    spaceId: 'space-1',
    title: `Post ${id}`,
    bodyHtml: null,
    bodyText: `Body ${id}`,
    imageUrl: null,
    tiptapDoc: null,
    embeds: {},
    inlineAttachments: [],
    authorName: 'Jane',
    authorAvatarUrl: null,
    spaceName: 'Laska',
    createdAt: '2026-07-13T10:00:00.000Z',
    commentCount: 2,
    likeCount: 4,
    isLiked: false,
    url: null,
  };
}

describe('member content cache', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('returns a saved feed only to the member and organisation that cached it', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toEqual({
      data: [FEED_ITEM],
      fetchedAt: NOW,
    });
    expect(getCachedMemberFeed(OTHER_SCOPE, NOW + 1)).toBeNull();
  });

  it('expires a saved feed after seven days', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);

    expect(getCachedMemberFeed(SCOPE, NOW + SEVEN_DAYS_MS - 1)).not.toBeNull();
    expect(getCachedMemberFeed(SCOPE, NOW + SEVEN_DAYS_MS)).toBeNull();
  });

  it('returns an opened post until its seven-day expiry', () => {
    setCachedMemberPost(postLocator('post-1'), postDetail('post-1'), NOW);

    expect(getCachedMemberPost(postLocator('post-1'), NOW + 1)).toEqual({
      data: postDetail('post-1'),
      fetchedAt: NOW,
    });
    expect(
      getCachedMemberPost(postLocator('post-1'), NOW + SEVEN_DAYS_MS),
    ).toBeNull();
  });

  it('keeps only the 50 most recently used posts', () => {
    for (let index = 0; index < 51; index += 1) {
      setCachedMemberPost(postLocator(`post-${index}`), postDetail(`post-${index}`), NOW + index);
    }

    expect(getCachedMemberPost(postLocator('post-0'), NOW + 100)).toBeNull();
    expect(getCachedMemberPost(postLocator('post-50'), NOW + 100)).not.toBeNull();
  });

  it('promotes an opened post so LRU eviction keeps it', () => {
    for (let index = 0; index < 50; index += 1) {
      setCachedMemberPost(postLocator(`post-${index}`), postDetail(`post-${index}`), NOW + index);
    }

    getCachedMemberPost(postLocator('post-0'), NOW + 100);
    setCachedMemberPost(postLocator('post-50'), postDetail('post-50'), NOW + 101);

    expect(getCachedMemberPost(postLocator('post-0'), NOW + 102)).not.toBeNull();
    expect(getCachedMemberPost(postLocator('post-1'), NOW + 102)).toBeNull();
  });

  it('fails closed when the stored envelope is corrupt', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);
    const key = [...mockStore.keys()][0];
    mockStore.set(key, {
      schemaVersion: 2,
      scope: SCOPE,
      feed: { data: [FEED_ITEM], fetchedAt: NOW },
      posts: null,
    });

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toBeNull();
  });

  it('drops a schema-v1 envelope cached before isLiked existed', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);
    const key = [...mockStore.keys()][0];
    const { isLiked: _isLiked, ...legacyItem } = FEED_ITEM;
    mockStore.set(key, {
      schemaVersion: 1,
      scope: SCOPE,
      feed: { data: [legacyItem], fetchedAt: NOW },
      posts: {},
    });

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toBeNull();
  });

  it('rejects cached feed items that lack the isLiked flag even at the current version', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);
    const key = [...mockStore.keys()][0];
    const { isLiked: _isLiked, ...legacyItem } = FEED_ITEM;
    mockStore.set(key, {
      schemaVersion: 2,
      scope: SCOPE,
      feed: { data: [legacyItem], fetchedAt: NOW },
      posts: {},
    });

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toBeNull();
  });

  it('clears only the requested member and organisation scope', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);
    setCachedMemberFeed(OTHER_SCOPE, [FEED_ITEM], NOW);

    clearMemberContentCache(SCOPE);

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toBeNull();
    expect(getCachedMemberFeed(OTHER_SCOPE, NOW + 1)).not.toBeNull();
  });
});

describe('member content cache — poll feed items (S12-01a)', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('round-trips a feed containing a kind:poll item', () => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM, POLL_FEED_ITEM], NOW);

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toEqual({
      data: [FEED_ITEM, POLL_FEED_ITEM],
      fetchedAt: NOW,
    });
  });

  it.each([
    ['missing scope', (poll: Record<string, unknown>) => { delete poll.scope; }],
    ['invalid scope', (poll: Record<string, unknown>) => { poll.scope = 'invalid'; }],
    ['non-string circleSpaceId', (poll: Record<string, unknown>) => { poll.circleSpaceId = 1; }],
    ['missing closesAt', (poll: Record<string, unknown>) => { delete poll.closesAt; }],
    ['option without sortOrder', (poll: Record<string, unknown>) => { delete (poll.options as Record<string, unknown>[])[0].sortOrder; }],
    ['missing results.byOption', (poll: Record<string, unknown>) => { poll.results = { total: 1 }; }],
    ['non-numeric results.byOption value', (poll: Record<string, unknown>) => { poll.results = { total: 1, byOption: { o1: 'one' } }; }],
  ])('drops only a cached poll with %s', (_reason, corrupt) => {
    setCachedMemberFeed(SCOPE, [FEED_ITEM], NOW);
    const key = [...mockStore.keys()][0];
    const invalidPoll = structuredClone(POLL_FEED_ITEM) as Record<string, unknown>;
    corrupt(invalidPoll.poll as Record<string, unknown>);
    mockStore.set(key, {
      schemaVersion: 2,
      scope: SCOPE,
      feed: {
        data: [FEED_ITEM, invalidPoll],
        fetchedAt: NOW,
      },
      posts: {},
    });

    expect(getCachedMemberFeed(SCOPE, NOW + 1)).toEqual({ data: [FEED_ITEM], fetchedAt: NOW });
  });
});
