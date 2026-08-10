import type { Horse } from '@/features/stables/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

/**
 * The member's followed horses, for the Home "My Horses" tile (S7) and any
 * other surface that needs a followed-only view. Shares the `horses` query
 * root with useHorses/useHorse so a follow/unfollow mutation's optimistic
 * cache patch (see use-horse-follow.ts) reaches this list too.
 */
export function useFollowedHorses() {
  return useQuery({
    queryKey: [STABLES_QUERY_ROOT, 'following', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/horses/following', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID },
      });
      return data as Horse[];
    },
  });
}
