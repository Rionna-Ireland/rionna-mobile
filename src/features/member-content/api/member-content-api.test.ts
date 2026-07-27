import {
  fetchMemberFeed,
  resolveMemberFeedContentState,
} from '@/features/member-content/api/use-member-feed';

import {
  fetchMemberPost,
  resolveMemberPostContentState,
} from '@/features/member-content/api/use-member-post';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

function feedItem(index: number) {
  return {
    id: `post-${index}`,
    spaceId: 'space-1',
    kind: 'post' as const,
    title: `Post ${index}`,
    excerpt: null,
    createdAt: null,
    spaceName: 'Laska',
    authorName: 'Jane',
    commentCount: 0,
    likeCount: 0,
    isLiked: false,
    imageUrl: null,
    url: null,
  };
}

const POST_DETAIL = {
  id: 'post-1',
  spaceId: 'space-1',
  title: 'Morning update',
  bodyHtml: null,
  bodyText: 'Laska worked well.',
  imageUrl: null,
  tiptapDoc: null,
  embeds: {},
  inlineAttachments: [],
  authorName: 'Jane',
  authorAvatarUrl: null,
  spaceName: 'Laska',
  createdAt: null,
  commentCount: 2,
  likeCount: 4,
  isLiked: false,
  url: null,
};

describe('member content API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads only the latest 15 posts for the configured organisation', async () => {
    const items = Array.from({ length: 20 }, (_, index) => feedItem(index));
    mockGet.mockResolvedValue({
      data: { ok: true, items, page: 1, hasNextPage: true },
    });

    await expect(fetchMemberFeed(SCOPE)).resolves.toEqual(items.slice(0, 15));
    expect(mockGet).toHaveBeenCalledWith('/api/circle/member-feed', {
      params: { organizationId: 'org-1', page: 1, perPage: 15 },
    });
  });

  it('rejects a failed feed envelope instead of replacing saved content with empty', async () => {
    mockGet.mockResolvedValue({
      data: { ok: false, items: [], page: 1, hasNextPage: false },
    });

    await expect(fetchMemberFeed(SCOPE)).rejects.toThrow('Member feed unavailable');
  });

  it('loads a post within the configured organisation and Circle space', async () => {
    mockGet.mockResolvedValue({ data: POST_DETAIL });

    await expect(fetchMemberPost(SCOPE, 'space-1', 'post-1')).resolves.toEqual(
      POST_DETAIL,
    );
    expect(mockGet).toHaveBeenCalledWith('/api/circle/member-post', {
      params: {
        organizationId: 'org-1',
        spaceId: 'space-1',
        postId: 'post-1',
      },
    });
  });

  it('rejects a null post so saved post content is not overwritten', async () => {
    mockGet.mockResolvedValue({ data: null });

    await expect(fetchMemberPost(SCOPE, 'space-1', 'post-1')).rejects.toThrow(
      'Member post unavailable',
    );
  });

  it('exposes fresh, saved, empty, and unavailable feed states', () => {
    expect(resolveMemberFeedContentState({ data: [], isError: false })).toBe('empty');
    expect(resolveMemberFeedContentState({ data: [feedItem(1)], isError: false })).toBe('fresh');
    expect(resolveMemberFeedContentState({ data: [feedItem(1)], isError: true })).toBe('saved');
    expect(resolveMemberFeedContentState({ data: undefined, isError: true })).toBe('unavailable');
  });

  it('exposes saved post content when refresh fails', () => {
    expect(resolveMemberPostContentState(POST_DETAIL, true)).toBe('saved');
    expect(resolveMemberPostContentState(POST_DETAIL, false)).toBe('fresh');
    expect(resolveMemberPostContentState(undefined, true)).toBe('unavailable');
  });
});
