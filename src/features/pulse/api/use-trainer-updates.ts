import type { TrainerUpdate } from '@/features/pulse/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

/**
 * Pulse "Trainer Updates" tile (S8-07) — latest published trainer-type
 * horse updates, org-wide, sourced from MemberPost (the source of truth
 * since S8-01 A2) rather than the legacy dedicated Circle space.
 */
export function useTrainerUpdates() {
  return useQuery({
    queryKey: ['trainer-updates', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/member-posts/trainer-updates', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID, limit: 3 },
      });
      return (data ?? []) as TrainerUpdate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
