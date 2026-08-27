import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type {
  InsideTrackResult,
  MemberContentScope,
  MemberFeedItem,
  MemberPostDetail,
} from '@/features/member-content/types';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

export type PostLikeVariables = {
  postId: string;
  liked: boolean;
};

export type SetPostLikeResult = {
  ok: boolean;
  liked: boolean;
  likeCount: number | null;
};

export type LikeSnapshot = [QueryKey, unknown];

export async function sendPostLike(
  scope: MemberContentScope,
  { postId, liked }: PostLikeVariables,
): Promise<SetPostLikeResult> {
  const { data } = await client.post<SetPostLikeResult>('/api/circle/post-like', {
    organizationId: scope.organizationId,
    postId,
    liked,
  });
  if (data.ok !== true) {
    throw new Error('Post like failed');
  }
  return data;
}

function flipCounts<T extends { likeCount: number; isLiked: boolean }>(
  entry: T,
  liked: boolean,
): T {
  return {
    ...entry,
    isLiked: liked,
    likeCount: Math.max(0, entry.likeCount + (liked ? 1 : -1)),
  };
}

/** Returns the same array when nothing changes so callers can skip snapshots. */
export function applyLikeToFeedItems(
  items: MemberFeedItem[],
  postId: string,
  liked: boolean,
): MemberFeedItem[] {
  if (!items.some(item => item.id === postId && item.isLiked !== liked)) {
    return items;
  }
  return items.map(item =>
    item.id === postId && item.isLiked !== liked ? flipCounts(item, liked) : item,
  );
}

/** Returns the same object when the detail is not the target (or already matches). */
export function applyLikeToPostDetail(
  post: MemberPostDetail,
  postId: string,
  liked: boolean,
): MemberPostDetail {
  if (post.id !== postId || post.isLiked === liked) {
    return post;
  }
  return flipCounts(post, liked);
}

function isFeedItems(data: unknown): data is MemberFeedItem[] {
  return Array.isArray(data);
}

function isPostDetail(data: unknown): data is MemberPostDetail {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
    && typeof (data as MemberPostDetail).id === 'string'
    && typeof (data as MemberPostDetail).isLiked === 'boolean';
}

/**
 * The Inside Track query caches `{ ok, configured, pinned, latest }` — not a
 * bare feed array or a post detail — so it fell through both guards above
 * and never got the optimistic flip applied (or reconciled on settle).
 */
function isInsideTrackResult(data: unknown): data is InsideTrackResult {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
    && typeof (data as InsideTrackResult).ok === 'boolean'
    && typeof (data as InsideTrackResult).configured === 'boolean'
    && Array.isArray((data as InsideTrackResult).pinned)
    && Array.isArray((data as InsideTrackResult).latest);
}

/**
 * Optimistically flips the post in every member-content cache it appears in
 * (merged feed, space feeds, post detail) and returns snapshots of the
 * caches that changed, for rollback on error.
 */
export function applyOptimisticLike(
  queryClient: QueryClient,
  postId: string,
  liked: boolean,
): LikeSnapshot[] {
  const snapshots: LikeSnapshot[] = [];
  const entries = queryClient.getQueriesData<unknown>({
    queryKey: [MEMBER_CONTENT_QUERY_ROOT],
  });
  for (const [queryKey, data] of entries) {
    if (isFeedItems(data)) {
      const next = applyLikeToFeedItems(data, postId, liked);
      if (next !== data) {
        snapshots.push([queryKey, data]);
        queryClient.setQueryData(queryKey, next);
      }
    }
    else if (isPostDetail(data)) {
      const next = applyLikeToPostDetail(data, postId, liked);
      if (next !== data) {
        snapshots.push([queryKey, data]);
        queryClient.setQueryData(queryKey, next);
      }
    }
    else if (isInsideTrackResult(data)) {
      const nextPinned = applyLikeToFeedItems(data.pinned, postId, liked);
      const nextLatest = applyLikeToFeedItems(data.latest, postId, liked);
      if (nextPinned !== data.pinned || nextLatest !== data.latest) {
        snapshots.push([queryKey, data]);
        queryClient.setQueryData(queryKey, { ...data, pinned: nextPinned, latest: nextLatest });
      }
    }
  }
  return snapshots;
}

/**
 * Writes the server's authoritative like state over the optimistic guess in
 * every cache the post appears in. Cheaper than invalidating the whole
 * member-content root, which refetches every feed and makes the list jump.
 */
export function reconcileLikeCount(
  queryClient: QueryClient,
  { postId, liked, likeCount }: { postId: string; liked: boolean; likeCount: number | null },
): void {
  if (likeCount === null) {
    return;
  }
  const entries = queryClient.getQueriesData<unknown>({
    queryKey: [MEMBER_CONTENT_QUERY_ROOT],
  });
  for (const [queryKey, data] of entries) {
    if (isFeedItems(data)) {
      if (!data.some(item => item.id === postId
        && (item.isLiked !== liked || item.likeCount !== likeCount))) {
        continue;
      }
      queryClient.setQueryData(
        queryKey,
        data.map(item => (item.id === postId ? { ...item, isLiked: liked, likeCount } : item)),
      );
    }
    else if (isPostDetail(data)) {
      if (data.id !== postId || (data.isLiked === liked && data.likeCount === likeCount)) {
        continue;
      }
      queryClient.setQueryData(queryKey, { ...data, isLiked: liked, likeCount });
    }
    else if (isInsideTrackResult(data)) {
      const matches = (item: MemberFeedItem) =>
        item.id === postId && (item.isLiked !== liked || item.likeCount !== likeCount);
      if (!data.pinned.some(matches) && !data.latest.some(matches)) {
        continue;
      }
      queryClient.setQueryData(queryKey, {
        ...data,
        pinned: data.pinned.map(item => (item.id === postId ? { ...item, isLiked: liked, likeCount } : item)),
        latest: data.latest.map(item => (item.id === postId ? { ...item, isLiked: liked, likeCount } : item)),
      });
    }
  }
}

export function rollbackOptimisticLike(
  queryClient: QueryClient,
  snapshots: LikeSnapshot[],
): void {
  for (const [queryKey, data] of snapshots) {
    queryClient.setQueryData(queryKey, data);
  }
}

/**
 * Like/unlike a post with an instant optimistic flip across the merged feed,
 * space feeds, and post detail; rolls back on error and reconciles with the
 * server on settle.
 */
export function usePostLike(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (variables: PostLikeVariables) => sendPostLike(scope, variables),
    onMutate: async (variables: PostLikeVariables) => {
      await queryClient.cancelQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
      return {
        snapshots: applyOptimisticLike(queryClient, variables.postId, variables.liked),
      };
    },
    onError: (_error, _variables, context) => {
      rollbackOptimisticLike(queryClient, context?.snapshots ?? []);
      // Server state is unknown after a failure — resync in the background.
      void queryClient.invalidateQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
    },
    // On success, patch in the server's count instead of invalidating the
    // whole root — a blanket refetch replaces every feed and jumps the list.
    onSuccess: (result, variables) => {
      reconcileLikeCount(queryClient, {
        postId: variables.postId,
        liked: result.liked,
        likeCount: result.likeCount,
      });
    },
  });

  return {
    ...mutation,
    toggleLike: mutation.mutate,
    pendingPostId: mutation.isPending ? (mutation.variables?.postId ?? null) : null,
  };
}
