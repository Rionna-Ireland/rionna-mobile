import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type {
  InsideTrackResult,
  MemberFeedItem,
  MemberPostDetail,
} from '@/features/member-content/types';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';

export type PostCacheSnapshot = [QueryKey, unknown];

/** Return the same object when nothing changes, so the cache is left alone. */
export type PostPatch = <T extends MemberFeedItem | MemberPostDetail>(post: T) => T;

function isPostDetail(data: unknown): data is MemberPostDetail {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
    && typeof (data as MemberPostDetail).id === 'string'
    && typeof (data as MemberPostDetail).commentCount === 'number';
}

function isInsideTrackResult(data: unknown): data is InsideTrackResult {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
    && typeof (data as InsideTrackResult).ok === 'boolean'
    && typeof (data as InsideTrackResult).configured === 'boolean'
    && Array.isArray((data as InsideTrackResult).pinned)
    && Array.isArray((data as InsideTrackResult).latest);
}

function patchItems(items: MemberFeedItem[], postId: string, fn: PostPatch): MemberFeedItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== postId)
      return item;
    const patched = fn(item);
    changed ||= patched !== item;
    return patched;
  });
  return changed ? next : items;
}

/**
 * Applies `fn` to the post in every member-content cache shape it lives in:
 * feed arrays (merged and space feeds), post detail, and Inside Track
 * (`{ pinned, latest }`). Patch in place, never invalidate the root (S7-03:
 * the refetch replaces every feed and jumps the list). Returns snapshots of
 * the caches that changed, for rollback.
 */
export function patchPostInCaches(
  queryClient: QueryClient,
  postId: string,
  fn: PostPatch,
): PostCacheSnapshot[] {
  const snapshots: PostCacheSnapshot[] = [];
  const entries = queryClient.getQueriesData<unknown>({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
  for (const [queryKey, data] of entries) {
    let next: unknown = data;
    if (Array.isArray(data)) {
      next = patchItems(data as MemberFeedItem[], postId, fn);
    }
    else if (isInsideTrackResult(data)) {
      const pinned = patchItems(data.pinned, postId, fn);
      const latest = patchItems(data.latest, postId, fn);
      if (pinned !== data.pinned || latest !== data.latest)
        next = { ...data, pinned, latest };
    }
    else if (isPostDetail(data) && data.id === postId) {
      next = fn(data);
    }
    if (next !== data) {
      snapshots.push([queryKey, data]);
      queryClient.setQueryData(queryKey, next);
    }
  }
  return snapshots;
}
