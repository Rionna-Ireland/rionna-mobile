import type { QueryClient } from '@tanstack/react-query';

import type {
  MemberContentScope,
  MemberFeedItem,
  MemberPostDetail,
  PostComment,
  PostCommentsPage,
} from '@/features/member-content/types';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

export function commentsQueryKey(scope: MemberContentScope, postId: string) {
  return [
    MEMBER_CONTENT_QUERY_ROOT,
    'comments',
    scope.organizationId,
    scope.memberId,
    postId,
  ] as const;
}

export async function fetchPostComments(
  scope: MemberContentScope,
  postId: string,
): Promise<PostCommentsPage> {
  const { data } = await client.get<PostCommentsPage>('/api/circle/post-comments', {
    params: { organizationId: scope.organizationId, postId, page: 1 },
  });
  if (data.ok !== true) {
    throw new Error('Comments unavailable');
  }
  return data;
}

export async function sendPostComment(
  scope: MemberContentScope,
  { postId, body }: { postId: string; body: string },
): Promise<PostComment | null> {
  const { data } = await client.post<{ ok: boolean; comment: PostComment | null }>(
    '/api/circle/post-comment',
    { organizationId: scope.organizationId, postId, body },
  );
  if (data.ok !== true) {
    throw new Error('Comment failed');
  }
  return data.comment;
}

export async function sendDeletePostComment(
  scope: MemberContentScope,
  { postId, commentId }: { postId: string; commentId: string },
): Promise<void> {
  const { data } = await client.post<{ ok: boolean }>('/api/circle/post-comment-delete', {
    organizationId: scope.organizationId,
    postId,
    commentId,
  });
  if (data.ok !== true) {
    throw new Error('Comment delete failed');
  }
}

/** Returns the same array when the id is absent so callers can skip writes. */
export function replaceCommentById(
  comments: PostComment[],
  id: string,
  replacement: PostComment,
): PostComment[] {
  if (!comments.some(entry => entry.id === id)) {
    return comments;
  }
  return comments.map(entry => (entry.id === id ? replacement : entry));
}

/** Removes a comment by id from the top level or one reply level down. */
export function removeCommentById(comments: PostComment[], id: string): PostComment[] {
  const hasTarget = comments.some(
    entry => entry.id === id || entry.replies.some(reply => reply.id === id),
  );
  if (!hasTarget) {
    return comments;
  }
  return comments
    .filter(entry => entry.id !== id)
    .map(entry =>
      entry.replies.some(reply => reply.id === id)
        ? { ...entry, replies: entry.replies.filter(reply => reply.id !== id) }
        : entry,
    );
}

function isFeedItems(data: unknown): data is MemberFeedItem[] {
  return Array.isArray(data);
}

function isPostDetail(data: unknown): data is MemberPostDetail {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
    && typeof (data as MemberPostDetail).id === 'string'
    && typeof (data as MemberPostDetail).commentCount === 'number';
}

/**
 * Bumps the post's commentCount across the merged feed, space feeds, and post
 * detail caches in place — the S7-03 A2 lesson: patch, never invalidate the
 * root on success (the refetch replaces every feed and jumps the list).
 */
export function applyCommentCountDelta(
  queryClient: QueryClient,
  postId: string,
  delta: number,
): void {
  const entries = queryClient.getQueriesData<unknown>({
    queryKey: [MEMBER_CONTENT_QUERY_ROOT],
  });
  for (const [queryKey, data] of entries) {
    if (isFeedItems(data)) {
      if (!data.some(item => item.id === postId)) {
        continue;
      }
      queryClient.setQueryData(
        queryKey,
        data.map(item =>
          item.id === postId
            ? { ...item, commentCount: Math.max(0, item.commentCount + delta) }
            : item,
        ),
      );
    }
    else if (isPostDetail(data) && data.id === postId) {
      queryClient.setQueryData(queryKey, {
        ...data,
        commentCount: Math.max(0, data.commentCount + delta),
      });
    }
  }
}

export function usePostComments(scope: MemberContentScope, postId: string) {
  return useQuery({
    queryKey: commentsQueryKey(scope, postId),
    queryFn: () => fetchPostComments(scope, postId),
    enabled: postId.length > 0,
    staleTime: 0,
  });
}

/**
 * Write a comment with an optimistic append (temp id, the signed-in member as
 * author); on success the temp entry is swapped for the server record, on
 * error it is removed and the count un-bumped.
 */
export function useAddComment(scope: MemberContentScope, authorName: string | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      sendPostComment(scope, { postId, body }),
    onMutate: async ({ postId, body }) => {
      const queryKey = commentsQueryKey(scope, postId);
      await queryClient.cancelQueries({ queryKey });
      const tempId = `temp-${Date.now()}`;
      const optimistic: PostComment = {
        id: tempId,
        parentCommentId: null,
        bodyText: body,
        tiptapDoc: null,
        authorName,
        authorAvatarUrl: null,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        isLiked: false,
        canDelete: false,
        replies: [],
      };
      queryClient.setQueryData<PostCommentsPage>(queryKey, current =>
        current
          ? { ...current, comments: [...current.comments, optimistic] }
          : { ok: true, comments: [optimistic], hasNextPage: false, totalCount: 1 });
      applyCommentCountDelta(queryClient, postId, 1);
      return { tempId };
    },
    onSuccess: (created, { postId }, context) => {
      const queryKey = commentsQueryKey(scope, postId);
      if (created) {
        queryClient.setQueryData<PostCommentsPage>(queryKey, current =>
          current
            ? { ...current, comments: replaceCommentById(current.comments, context.tempId, created) }
            : current);
      }
      else {
        // Landed but unparseable — refetch this post's comments only.
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (_error, { postId }, context) => {
      if (!context) {
        return;
      }
      const queryKey = commentsQueryKey(scope, postId);
      queryClient.setQueryData<PostCommentsPage>(queryKey, current =>
        current
          ? { ...current, comments: removeCommentById(current.comments, context.tempId) }
          : current);
      applyCommentCountDelta(queryClient, postId, -1);
    },
  });

  return {
    ...mutation,
    addComment: mutation.mutate,
  };
}

/** Optimistically removes the comment; restores the page snapshot on error. */
export function useDeleteComment(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      sendDeletePostComment(scope, { postId, commentId }),
    onMutate: async ({ postId, commentId }) => {
      const queryKey = commentsQueryKey(scope, postId);
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<PostCommentsPage>(queryKey);
      queryClient.setQueryData<PostCommentsPage>(queryKey, current =>
        current
          ? { ...current, comments: removeCommentById(current.comments, commentId) }
          : current);
      applyCommentCountDelta(queryClient, postId, -1);
      return { snapshot };
    },
    onError: (_error, { postId }, context) => {
      if (!context) {
        return;
      }
      queryClient.setQueryData(commentsQueryKey(scope, postId), context.snapshot);
      applyCommentCountDelta(queryClient, postId, 1);
    },
  });

  return {
    ...mutation,
    deleteComment: mutation.mutate,
    pendingCommentId: mutation.isPending ? (mutation.variables?.commentId ?? null) : null,
  };
}
