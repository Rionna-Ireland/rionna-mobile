import type { QueryClient } from '@tanstack/react-query';

import type { PostCacheSnapshot } from '@/features/member-content/api/post-cache';

import type { MemberContentScope } from '@/features/member-content/types';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patchPostInCaches } from '@/features/member-content/api/post-cache';
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

export type LikeSnapshot = PostCacheSnapshot;

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

/**
 * Optimistically flips the post in every member-content cache it appears in
 * and returns snapshots of the caches that changed, for rollback on error.
 */
export function applyOptimisticLike(
  queryClient: QueryClient,
  postId: string,
  liked: boolean,
): LikeSnapshot[] {
  return patchPostInCaches(queryClient, postId, post =>
    post.isLiked === liked ? post : flipCounts(post, liked));
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
  patchPostInCaches(queryClient, postId, post =>
    post.isLiked === liked && post.likeCount === likeCount
      ? post
      : { ...post, isLiked: liked, likeCount });
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
