import type { Horse } from '@/features/stables/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

export function useHorses() {
  return useQuery({
    queryKey: ['horses', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/horses', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID },
      });
      return data as Horse[];
    },
  });
}
