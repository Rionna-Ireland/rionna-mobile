import type { HorseUpdate } from '@/features/stables/types';

import { useQuery } from '@tanstack/react-query';

import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

/**
 * A horse's published updates timeline (trainer notes, wellbeing, general,
 * race), newest first -- sourced from the "Horse updates" (MemberPost)
 * feature rather than the (now-deleted) parallel wellbeing system.
 * GET /horses/{horseId}/updates returns published-only entries.
 */
export function useHorseUpdates(horseId: string | undefined) {
  return useQuery({
    queryKey: [STABLES_QUERY_ROOT, horseId, 'updates'],
    queryFn: async () => {
      const { data } = await client.get(`/api/horses/${horseId}/updates`);
      return (data ?? []) as HorseUpdate[];
    },
    enabled: !!horseId,
  });
}
