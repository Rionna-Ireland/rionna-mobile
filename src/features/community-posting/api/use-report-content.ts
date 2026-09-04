import type { ReportContentResult, ReportInput } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { useCallback, useState } from 'react';

import { client } from '@/lib/api/client';

/** Reports a post or comment. Resolves `true` only on `{ ok: true }`; any error or `ok:false` resolves `false`. */
export function useReportContent(scope: MemberContentScope) {
  const [isPending, setIsPending] = useState(false);

  const report = useCallback(
    async (input: ReportInput): Promise<boolean> => {
      setIsPending(true);
      try {
        const { data } = await client.post<ReportContentResult>('/api/community/report', {
          organizationId: scope.organizationId,
          surface: input.surface,
          postId: input.postId,
          commentId: input.commentId,
          spaceId: input.spaceId,
          excerpt: input.excerpt,
          authorName: input.authorName,
          reason: input.reason,
          note: input.note,
        });
        return data.ok === true;
      }
      catch {
        return false;
      }
      finally {
        setIsPending(false);
      }
    },
    [scope],
  );

  return { report, isPending };
}
