import type {
  CachedContent,
  MemberContentScope,
  MemberFeedItem,
  MemberPostCacheLocator,
  MemberPostDetail,
} from '@/features/member-content/types';

import { getItem, removeItem, setItem } from '@/lib/storage';

// v2: feed items and post details carry isLiked (S7-03) — v1 envelopes are dropped.
const CACHE_SCHEMA_VERSION = 2;
const CACHE_KEY_PREFIX = 'member-content.v1';
export const MEMBER_CONTENT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHED_POSTS = 50;

type FeedEntry = CachedContent<MemberFeedItem[]>;
type PostEntry = CachedContent<MemberPostDetail> & {
  lastAccessedAt: number;
};

type MemberContentEnvelope = {
  schemaVersion: typeof CACHE_SCHEMA_VERSION;
  scope: MemberContentScope;
  feed: FeedEntry | null;
  posts: Record<string, PostEntry>;
};

function cacheKey(scope: MemberContentScope): string {
  return [
    CACHE_KEY_PREFIX,
    encodeURIComponent(scope.organizationId),
    encodeURIComponent(scope.memberId),
  ].join(':');
}

function emptyEnvelope(scope: MemberContentScope): MemberContentEnvelope {
  return {
    schemaVersion: CACHE_SCHEMA_VERSION,
    scope,
    feed: null,
    posts: {},
  };
}

function postKey(spaceId: string, postId: string): string {
  return `${encodeURIComponent(spaceId)}:${encodeURIComponent(postId)}`;
}

function cappedPosts(posts: Record<string, PostEntry>): Record<string, PostEntry> {
  return Object.fromEntries(
    Object.entries(posts)
      .sort(([, left], [, right]) => right.lastAccessedAt - left.lastAccessedAt)
      .slice(0, MAX_CACHED_POSTS),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isFeedItem(value: unknown): value is MemberFeedItem {
  if (!isRecord(value))
    return false;
  return (
    typeof value.id === 'string'
    && isNullableString(value.spaceId)
    && (value.kind === 'news' || value.kind === 'post' || value.kind === 'poll')
    && typeof value.title === 'string'
    && isNullableString(value.excerpt)
    && isNullableString(value.createdAt)
    && isNullableString(value.spaceName)
    && isNullableString(value.authorName)
    && typeof value.commentCount === 'number'
    && typeof value.likeCount === 'number'
    && typeof value.isLiked === 'boolean'
    && isNullableString(value.imageUrl)
    && isNullableString(value.url)
    && (value.kind !== 'poll' || isRecord(value.poll))
  );
}

function isPostDetail(value: unknown): value is MemberPostDetail {
  if (!isRecord(value))
    return false;
  return (
    typeof value.id === 'string'
    && isNullableString(value.spaceId)
    && typeof value.title === 'string'
    && isNullableString(value.bodyHtml)
    && isNullableString(value.bodyText)
    && isNullableString(value.imageUrl)
    && isRecord(value.embeds)
    && Array.isArray(value.inlineAttachments)
    && isNullableString(value.authorName)
    && isNullableString(value.authorAvatarUrl)
    && isNullableString(value.spaceName)
    && isNullableString(value.createdAt)
    && typeof value.commentCount === 'number'
    && typeof value.likeCount === 'number'
    && typeof value.isLiked === 'boolean'
    && isNullableString(value.url)
  );
}

function isFeedEntry(value: unknown): value is FeedEntry {
  return (
    isRecord(value)
    && Number.isFinite(value.fetchedAt)
    && Array.isArray(value.data)
    && value.data.every(isFeedItem)
  );
}

function isPostEntry(value: unknown): value is PostEntry {
  return (
    isRecord(value)
    && Number.isFinite(value.fetchedAt)
    && Number.isFinite(value.lastAccessedAt)
    && isPostDetail(value.data)
  );
}

function isEnvelope(value: unknown, scope: MemberContentScope): value is MemberContentEnvelope {
  if (!isRecord(value) || !isRecord(value.scope) || !isRecord(value.posts)) {
    return false;
  }
  return (
    value.schemaVersion === CACHE_SCHEMA_VERSION
    && value.scope.organizationId === scope.organizationId
    && value.scope.memberId === scope.memberId
    && (value.feed === null || isFeedEntry(value.feed))
    && Object.values(value.posts).every(isPostEntry)
  );
}

function readEnvelope(scope: MemberContentScope): MemberContentEnvelope | null {
  const key = cacheKey(scope);
  try {
    const envelope = getItem<unknown>(key);
    if (envelope === null) {
      return null;
    }
    if (!isEnvelope(envelope, scope)) {
      void removeItem(key);
      return null;
    }
    return envelope;
  }
  catch {
    void removeItem(key);
    return null;
  }
}

export function getCachedMemberFeed(
  scope: MemberContentScope,
  now: number = Date.now(),
): FeedEntry | null {
  const feed = readEnvelope(scope)?.feed ?? null;
  if (!feed || now >= feed.fetchedAt + MEMBER_CONTENT_CACHE_TTL_MS) {
    return null;
  }
  return feed;
}

export function setCachedMemberFeed(
  scope: MemberContentScope,
  data: MemberFeedItem[],
  fetchedAt: number = Date.now(),
): void {
  const envelope = readEnvelope(scope) ?? emptyEnvelope(scope);
  void setItem<MemberContentEnvelope>(cacheKey(scope), {
    ...envelope,
    feed: { data, fetchedAt },
  });
}

export function getCachedMemberPost(
  locator: MemberPostCacheLocator,
  now: number = Date.now(),
): CachedContent<MemberPostDetail> | null {
  const scope = locator;
  const envelope = readEnvelope(scope);
  const key = postKey(locator.spaceId, locator.postId);
  const post = envelope?.posts[key] ?? null;
  if (!envelope || !post || now >= post.fetchedAt + MEMBER_CONTENT_CACHE_TTL_MS) {
    return null;
  }

  void setItem<MemberContentEnvelope>(cacheKey(scope), {
    ...envelope,
    posts: {
      ...envelope.posts,
      [key]: { ...post, lastAccessedAt: now },
    },
  });
  return { data: post.data, fetchedAt: post.fetchedAt };
}

export function setCachedMemberPost(
  locator: MemberPostCacheLocator,
  data: MemberPostDetail,
  fetchedAt: number = Date.now(),
): void {
  const scope = locator;
  const envelope = readEnvelope(scope) ?? emptyEnvelope(scope);
  const key = postKey(locator.spaceId, locator.postId);
  void setItem<MemberContentEnvelope>(cacheKey(scope), {
    ...envelope,
    posts: cappedPosts({
      ...envelope.posts,
      [key]: { data, fetchedAt, lastAccessedAt: fetchedAt },
    }),
  });
}

export function clearMemberContentCache(scope: MemberContentScope): void {
  void removeItem(cacheKey(scope));
}
