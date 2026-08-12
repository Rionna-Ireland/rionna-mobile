import type { HorseStatus } from '@/features/stables/types';

// 'DECLARED' is not a value of HorseStatus (see filterHorsesByStatus below) —
// it's kept as its own filter value so it can match against nothing and
// return an empty list, rather than being forced into the enum.
export type StatusFilter = 'ALL' | HorseStatus | 'DECLARED';

/**
 * Client-side filter on horse.status. "DECLARED" has no matching horse.status
 * value in the current data model (it's likely an entry-level status, not a
 * horse-level one — see S8-01 §4 open question), so it filters to an empty
 * list gracefully instead of throwing.
 */
export function filterHorsesByStatus<T extends { status: HorseStatus }>(
  horses: T[],
  filter: StatusFilter,
): T[] {
  if (filter === 'ALL') {
    return horses;
  }
  return horses.filter(horse => (horse.status as StatusFilter) === filter);
}
