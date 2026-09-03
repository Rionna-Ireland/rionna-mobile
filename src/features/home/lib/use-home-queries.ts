import type { MemberContentScope } from '@/features/member-content/types';

import { useEvents } from '@/features/events/api/use-events';
import { useInsideTrack } from '@/features/member-content/api/use-inside-track';
import { useCharity } from '@/features/paddock/api/use-charity';
import { useOffers } from '@/features/paddock/api/use-offers';
import { useActivePolls } from '@/features/polls/api/use-active-polls';
import { useLatestNews } from '@/features/pulse/api/use-latest-news';
import { useLatestResults } from '@/features/pulse/api/use-latest-results';
import { useNextRun } from '@/features/pulse/api/use-next-run';
import { useTrainerUpdates } from '@/features/pulse/api/use-trainer-updates';
import { useFollowedHorses } from '@/features/stables/api/use-followed-horses';

/** Every Home tile query in one place so the screen stays under the lines-per-function budget. */
export function useHomeQueries(scope: MemberContentScope) {
  const queries = {
    nextRun: useNextRun(),
    results: useLatestResults(),
    news: useLatestNews(),
    trainerUpdates: useTrainerUpdates(),
    followedHorses: useFollowedHorses(),
    insideTrack: useInsideTrack(scope),
    upcomingEvents: useEvents(scope, 'upcoming'),
    activePolls: useActivePolls(scope),
    charity: useCharity(scope),
    offers: useOffers(scope),
  };
  const all = Object.values(queries);
  return {
    ...queries,
    isRefetching: all.some(q => q.isRefetching),
    refetchAll: () => {
      for (const q of all) void q.refetch();
    },
  };
}
