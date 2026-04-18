import type { NextRunEntry } from '@/features/pulse/types';

import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

export function useNextRun() {
  return useQuery({
    queryKey: ['next-run', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/horses/next-run', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID },
      });
      return data as NextRunEntry | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
