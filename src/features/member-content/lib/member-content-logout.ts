import type { MemberContentScope } from '@/features/member-content/types';

import { clearMemberContentCache } from '@/features/member-content/cache/member-content-cache';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { queryClient } from '@/lib/api/query-client';

export function clearMemberContentForMember(scope: MemberContentScope): void {
  clearMemberContentCache(scope);
  queryClient.removeQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
}
