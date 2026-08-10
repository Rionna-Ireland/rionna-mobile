import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { Horse, HorseDetail } from '@/features/stables/types';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showErrorMessage } from '@/components/ui/utils';
import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

export type HorseFollowVariables = {
  horseId: string;
  following: boolean;
};

export type SetHorseFollowResult = {
  isFollowing: boolean;
};

export type FollowSnapshot = [QueryKey, unknown];

export async function sendHorseFollow(
  { horseId, following }: HorseFollowVariables,
): Promise<SetHorseFollowResult> {
  if (following) {
    await client.post(`/api/horses/${horseId}/follow`);
  }
  else {
    await client.delete(`/api/horses/${horseId}/follow`);
  }
  return { isFollowing: following };
}

function flipFollow<T extends { isFollowing: boolean }>(entry: T, following: boolean): T {
  return { ...entry, isFollowing: following };
}

/** Returns the same array when nothing changes so callers can skip snapshots. */
export function applyFollowToHorseList(
  items: Horse[],
  horseId: string,
  following: boolean,
): Horse[] {
  if (!items.some(item => item.id === horseId && item.isFollowing !== following)) {
    return items;
  }
  return items.map(item =>
    item.id === horseId && item.isFollowing !== following ? flipFollow(item, following) : item,
  );
}

/** Returns the same object when the detail is not the target (or already matches). */
export function applyFollowToHorseDetail(
  horse: HorseDetail,
  horseId: string,
  following: boolean,
): HorseDetail {
  if (horse.id !== horseId || horse.isFollowing === following) {
    return horse;
  }
  return flipFollow(horse, following);
}

function isHorseList(data: unknown): data is Horse[] {
  return Array.isArray(data);
}

function isHorseDetail(data: unknown): data is HorseDetail {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
    && typeof (data as HorseDetail).id === 'string'
    && typeof (data as HorseDetail).isFollowing === 'boolean';
}

/**
 * Optimistically flips the horse in every horses cache it appears in (the
 * stables list, the followed-horses list, and the horse detail) and returns
 * snapshots of the caches that changed, for rollback on error.
 */
export function applyOptimisticFollow(
  queryClient: QueryClient,
  horseId: string,
  following: boolean,
): FollowSnapshot[] {
  const snapshots: FollowSnapshot[] = [];
  const entries = queryClient.getQueriesData<unknown>({
    queryKey: [STABLES_QUERY_ROOT],
  });
  for (const [queryKey, data] of entries) {
    if (isHorseList(data)) {
      const next = applyFollowToHorseList(data, horseId, following);
      if (next !== data) {
        snapshots.push([queryKey, data]);
        queryClient.setQueryData(queryKey, next);
      }
    }
    else if (isHorseDetail(data)) {
      const next = applyFollowToHorseDetail(data, horseId, following);
      if (next !== data) {
        snapshots.push([queryKey, data]);
        queryClient.setQueryData(queryKey, next);
      }
    }
  }
  return snapshots;
}

/**
 * Writes the server's authoritative follow state over the optimistic guess
 * in every cache the horse appears in. Cheaper than invalidating the whole
 * horses root, which would refetch every list and jump the screen.
 */
export function reconcileFollow(
  queryClient: QueryClient,
  { horseId, isFollowing }: { horseId: string; isFollowing: boolean },
): void {
  const entries = queryClient.getQueriesData<unknown>({
    queryKey: [STABLES_QUERY_ROOT],
  });
  for (const [queryKey, data] of entries) {
    if (isHorseList(data)) {
      if (!data.some(item => item.id === horseId && item.isFollowing !== isFollowing)) {
        continue;
      }
      queryClient.setQueryData(
        queryKey,
        data.map(item => (item.id === horseId ? { ...item, isFollowing } : item)),
      );
    }
    else if (isHorseDetail(data)) {
      if (data.id !== horseId || data.isFollowing === isFollowing) {
        continue;
      }
      queryClient.setQueryData(queryKey, { ...data, isFollowing });
    }
  }
}

export function rollbackOptimisticFollow(
  queryClient: QueryClient,
  snapshots: FollowSnapshot[],
): void {
  for (const [queryKey, data] of snapshots) {
    queryClient.setQueryData(queryKey, data);
  }
}

/**
 * Follow/unfollow a horse with an instant optimistic flip across the
 * stables list, the followed-horses list, and the horse detail; rolls back
 * and shows an error toast on failure, and reconciles with the server on
 * settle.
 */
export function useFollowHorse() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (variables: HorseFollowVariables) => sendHorseFollow(variables),
    onMutate: async (variables: HorseFollowVariables) => {
      // Cancel only the queries the optimistic patch rewrites; the wellbeing
      // timeline ([root, horseId, 'wellbeing']) is never patched, and
      // cancelling it mid-fetch would strand it idle/undefined.
      await queryClient.cancelQueries({
        queryKey: [STABLES_QUERY_ROOT],
        predicate: query => query.queryKey[query.queryKey.length - 1] !== 'wellbeing',
      });
      return {
        snapshots: applyOptimisticFollow(queryClient, variables.horseId, variables.following),
      };
    },
    onError: (_error, variables, context) => {
      rollbackOptimisticFollow(queryClient, context?.snapshots ?? []);
      // Server state is unknown after a failure — resync in the background.
      void queryClient.invalidateQueries({ queryKey: [STABLES_QUERY_ROOT] });
      showErrorMessage(
        variables.following
          ? 'Could not follow this horse. Please try again.'
          : 'Could not unfollow this horse. Please try again.',
      );
    },
    onSuccess: (result, variables) => {
      reconcileFollow(queryClient, {
        horseId: variables.horseId,
        isFollowing: result.isFollowing,
      });
    },
    onSettled: () => {
      // reconcileFollow/rollback only flip isFollowing on horses already
      // present in a cache — neither inserts a newly-followed horse into
      // the followed-list cache nor removes a newly-unfollowed one.
      // Invalidate just that list (not the whole STABLES_QUERY_ROOT) so
      // membership stays correct without refetching/jumping the stables
      // list itself.
      void queryClient.invalidateQueries({ queryKey: [STABLES_QUERY_ROOT, 'following'] });
    },
  });

  return {
    ...mutation,
    toggleFollow: mutation.mutate,
    pendingHorseId: mutation.isPending ? (mutation.variables?.horseId ?? null) : null,
  };
}
