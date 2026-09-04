import type { CreatePostFailure, CreatePostInput, CreatePostResult } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { uploadImage } from '@/features/community-posting/lib/upload-image';
import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { client } from '@/lib/api/client';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type CreatePostFailureState = CreatePostFailure | 'network' | null;

/**
 * Uploads an optional image and creates a member post. Never throws for a
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
        if (input.image && input.image.fileSize > MAX_IMAGE_BYTES) {
          setFailure('image_failed');
          return { ok: false, reason: 'image_failed' };
        }

        const imageKey = input.image ? await uploadImage(scope, input.image) : undefined;

        const { data } = await client.post<CreatePostResult>('/api/community/posts', {
          organizationId: scope.organizationId,
          spaceId: input.spaceId,
          title: input.title,
          body: input.body,
          imageKey,
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
