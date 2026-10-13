import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/api/client';

export type MembershipStatus = 'active' | 'past_due' | 'cancelled' | 'none';

/** GET /api/me/membership. Display-only (D9): no renewal dates, amounts or payment history. */
export type Membership = {
  since: string | null;
  foundingMember: boolean;
  status: MembershipStatus;
};

/** The signed-in member's membership; keyed by user so an account switch can't show stale data. */
export function useMembership(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', 'membership', userId],
    queryFn: async () => {
      const { data } = await client.get('/api/me/membership');
      return data as Membership;
    },
    enabled: !!userId,
  });
}
