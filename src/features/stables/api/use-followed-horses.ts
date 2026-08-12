import type { Horse } from '@/features/stables/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

/**
 * Raw shape of GET /api/horses/following: HorseFollow join rows, not Horse
 * rows (see listFollowedHorses in rionna-ireland's
 * packages/api/modules/racing/horses/lib/horse-follows.ts). The follow row's
 * own `id` is not the horse id, so it must be discarded in favor of
 * `horse.id` below.
 */
type HorseFollowRow = {
  id: string;
  userId: string;
  horseId: string;
  organizationId: string;
  createdAt: string;
  horse: Omit<Horse, 'isFollowing'>;
};

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
      // Every row here is, by definition, a horse the member follows.
      return (data as HorseFollowRow[]).map(row => ({ ...row.horse, isFollowing: true }) as Horse);
    },
  });
}
