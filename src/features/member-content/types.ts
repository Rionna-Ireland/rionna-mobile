export type MemberContentScope = {
  organizationId: string;
  memberId: string;
};

export type MemberPostCacheLocator = MemberContentScope & {
  spaceId: string;
  postId: string;
};

export const MEMBER_CONTENT_QUERY_ROOT = 'member-content';

export type MemberFeedItem = {
  id: string;
  spaceId: string | null;
  kind: 'news' | 'post';
  title: string;
  excerpt: string | null;
  createdAt: string | null;
  spaceName: string | null;
  authorName: string | null;
  commentCount: number;
  likeCount: number;
  isLiked: boolean;
  imageUrl: string | null;
  url: string | null;
};

export type MemberFeedResult = {
  ok: boolean;
  items: MemberFeedItem[];
  page: number;
  hasNextPage: boolean;
};

export type MemberPostDetail = {
  id: string;
  spaceId: string | null;
  title: string;
  bodyHtml: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  tiptapDoc: unknown | null;
  embeds: Record<string, unknown>;
  inlineAttachments: Array<Record<string, unknown>>;
  authorName: string | null;
  authorAvatarUrl: string | null;
  spaceName: string | null;
  createdAt: string | null;
  commentCount: number;
  likeCount: number;
  isLiked: boolean;
  url: string | null;
};

export type PostComment = {
  id: string;
  parentCommentId: string | null;
  bodyText: string | null;
  tiptapDoc: Record<string, unknown> | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  createdAt: string | null;
  likeCount: number;
  isLiked: boolean;
  canDelete: boolean;
  replies: PostComment[];
};

export type PostCommentsPage = {
  ok: boolean;
  comments: PostComment[];
  hasNextPage: boolean;
  totalCount: number | null;
};

export type MemberContentState = 'fresh' | 'saved' | 'empty' | 'unavailable';

export type CachedContent<T> = {
  data: T;
  fetchedAt: number;
};
