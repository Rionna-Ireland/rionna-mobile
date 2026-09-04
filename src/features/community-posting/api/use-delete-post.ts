import type { DeletePostInput, DeletePostResult } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

/** Deletes a member post. Resolves `false` on any failure — never throws. */
export function useDeletePost(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const remove = useCallback(
    async ({ spaceId, postId }: DeletePostInput): Promise<boolean> => {
      setIsPending(true);
      try {
        const { data } = await client.post<DeletePostResult>('/api/community/posts/delete', {
          organizationId: scope.organizationId,
          spaceId,
          postId,
        });
        if (data.ok === true) {
          void queryClient.invalidateQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
        }
        return data.ok === true;
      }
      catch {
        return false;
      }
      finally {
        setIsPending(false);
      }
    },
    [scope, queryClient],
  );

  return { remove, isPending };
}
