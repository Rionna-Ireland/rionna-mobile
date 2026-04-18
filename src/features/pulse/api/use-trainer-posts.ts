import type { TrainerPost } from '@/features/pulse/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

export function useTrainerPosts() {
  return useQuery({
    queryKey: ['trainer-posts', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/circle/trainer-posts', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID, limit: 3 },
      });
      return data as TrainerPost[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
