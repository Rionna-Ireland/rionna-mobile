import type { MemberContentScope } from '../types';

import { queryClient } from '@/lib/api/query-client';

import { clearMemberContentCache } from '../cache/member-content-cache';
import { MEMBER_CONTENT_QUERY_ROOT } from '../types';

export function clearMemberContentForMember(scope: MemberContentScope): void {
  clearMemberContentCache(scope);
  queryClient.removeQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] });
}
