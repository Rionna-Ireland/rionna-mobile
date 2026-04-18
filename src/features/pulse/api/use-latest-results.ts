import type { LatestResult } from '@/features/pulse/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

export function useLatestResults() {
  return useQuery({
    queryKey: ['latest-results', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/horses/latest-results', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID, limit: 3 },
      });
      return data as LatestResult[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
