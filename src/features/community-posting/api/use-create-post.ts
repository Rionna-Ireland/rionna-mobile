import type { CreatePostFailure, CreatePostInput, CreatePostResult } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

export type CreatePostFailureState = CreatePostFailure | 'network' | null;

/**
 * Creates a member post from already-uploaded media tokens. Never throws for a
 * backend-reported failure (`{ ok: false }`) — it resolves the result and
 * mirrors the reason into `failure`. A network/axios error resolves `null`
 * and sets `failure` to `'network'` instead of throwing to the caller.
 */
export function useCreatePost(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [failure, setFailure] = useState<CreatePostFailureState>(null);

  const create = useCallback(
    async (input: CreatePostInput): Promise<CreatePostResult | null> => {
      setIsPending(true);
      setFailure(null);
      try {
        const { data } = await client.post<CreatePostResult>('/api/community/posts', {
          organizationId: scope.organizationId,
          spaceId: input.spaceId,
          title: input.title,
          body: input.body,
          media: input.media?.length ? input.media : undefined,
        });

        if (data.ok !== true) {
          setFailure(data.reason);
          return data;
        }

        void queryClient.invalidateQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
        return data;
      }
      catch {
        setFailure('network');
        return null;
      }
      finally {
        setIsPending(false);
      }
    },
    [scope, queryClient],
  );

  return { create, isPending, failure };
}
