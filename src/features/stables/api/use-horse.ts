import type { HorseDetail } from '@/features/stables/types';

import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/api/client';

export function useHorse(horseId: string | undefined) {
  return useQuery({
    queryKey: ['horses', horseId],
    queryFn: async () => {
      const { data } = await client.get(`/api/horses/${horseId}`);
      return data as HorseDetail;
    },
    enabled: !!horseId,
  });
}
