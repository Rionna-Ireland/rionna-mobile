import type { WellbeingUpdate } from '@/features/stables/types';

import { useQuery } from '@tanstack/react-query';

import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

/**
 * A horse's published wellbeing timeline (vet notes, training progress,
 * rehab/rest status), newest first. GET /horses/{horseId}/wellbeing
 * returns published-only entries -- see WellbeingUpdate for the response
 * shape note.
 */
export function useHorseWellbeing(horseId: string | undefined) {
  return useQuery({
    queryKey: [STABLES_QUERY_ROOT, horseId, 'wellbeing'],
    queryFn: async () => {
      const { data } = await client.get(`/api/horses/${horseId}/wellbeing`);
      return (data ?? []) as WellbeingUpdate[];
    },
    enabled: !!horseId,
  });
}
