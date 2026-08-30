import { EVENTS_QUERY_ROOT } from '@/features/events/types';
import { queryClient } from '@/lib/api/query-client';
import { removeItemsWithPrefix } from '@/lib/storage';

// Must stay in sync with the snapshotKey() prefix in
// src/features/events/api/use-events.ts.
const EVENTS_SNAPSHOT_PREFIX = 'events-snapshot:';

/**
 * Clear the events feature's persisted state on sign-out: every offline
 * snapshot MMKV entry (upcoming + past, any member/org) and the in-memory
 * React Query cache under the events root, so the next member to sign in on
 * this device never sees a previous member's cached events.
 */
export function clearEventsStorage(): void {
  removeItemsWithPrefix(EVENTS_SNAPSHOT_PREFIX);
  queryClient.removeQueries({ queryKey: [EVENTS_QUERY_ROOT] });
}
