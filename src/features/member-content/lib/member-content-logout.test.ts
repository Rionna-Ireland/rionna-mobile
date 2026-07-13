import { queryClient } from '@/lib/api/query-client';

import { clearMemberContentCache } from '../cache/member-content-cache';
import { clearMemberContentForMember } from './member-content-logout';

jest.mock('../cache/member-content-cache', () => ({
  clearMemberContentCache: jest.fn(),
}));

jest.mock('@/lib/api/query-client', () => ({
  queryClient: { removeQueries: jest.fn() },
}));

describe('clearMemberContentForMember', () => {
  it('clears the scoped offline cache and in-memory member queries', () => {
    clearMemberContentForMember({ organizationId: 'org-1', memberId: 'member-1' });

    expect(clearMemberContentCache).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-1',
    });
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: ['member-content'],
    });
  });
});
