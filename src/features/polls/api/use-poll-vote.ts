import type { QueryClient } from '@tanstack/react-query';

import type { MemberContentScope } from '@/features/member-content/types';
import type { ActivePollsResult, Poll, PollVoteResult, PollVoteVariables } from '@/features/polls/types';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MEMBER_CONTENT_QUERY_ROOT } from '@/features/member-content/types';
import { applyVoteToFeedItems, applyVoteToPolls, reconcilePollInFeedItems, reconcilePollInPolls } from '@/features/polls/api/poll-cache';
import { POLLS_QUERY_ROOT } from '@/features/polls/types';
import { client } from '@/lib/api/client';

type Snapshot = { queryKey: readonly unknown[]; data: unknown };

async function sendVote(scope: MemberContentScope, variables: PollVoteVariables): Promise<Poll> {
  const { data } = await client.post<PollVoteResult>('/api/polls/vote', {
    organizationId: scope.organizationId,
    ...variables,
  });
  if (data.ok !== true) {
    throw new Error(`Vote failed: ${data.reason}`);
  }
  return data.poll;
}

function isActivePollsResult(value: unknown): value is ActivePollsResult {
  return !!value && typeof value === 'object' && Array.isArray((value as ActivePollsResult).polls);
}

function isFeedItems(value: unknown): value is { id: string; kind: string; poll?: Poll }[] {
  return Array.isArray(value);
}

/** Patches every cache the poll appears in (S7-03 A2: patch in place, no root invalidation). */
function patchPollCaches(
  queryClient: QueryClient,
  patchPolls: (polls: Poll[]) => Poll[],
  patchFeed: <T extends { id: string; kind: string; poll?: Poll }>(items: T[]) => T[],
): Snapshot[] {
  const snapshots: Snapshot[] = [];
  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: [POLLS_QUERY_ROOT] })) {
    if (!isActivePollsResult(data))
      continue;
    snapshots.push({ queryKey, data });
    queryClient.setQueryData(queryKey, { ...data, polls: patchPolls(data.polls) });
  }
  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] })) {
    if (!isFeedItems(data))
      continue;
    snapshots.push({ queryKey, data });
    queryClient.setQueryData(queryKey, patchFeed(data));
  }
  return snapshots;
}

export function usePollVote(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (variables: PollVoteVariables) => sendVote(scope, variables),
    onMutate: async ({ pollId, optionId }) => {
      await queryClient.cancelQueries({ queryKey: [POLLS_QUERY_ROOT] });
      return {
        snapshots: patchPollCaches(
          queryClient,
          polls => applyVoteToPolls(polls, pollId, optionId),
          items => applyVoteToFeedItems(items, pollId, optionId),
        ),
      };
    },
    onError: (_error, _variables, context) => {
      for (const { queryKey, data } of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSuccess: (server) => {
      patchPollCaches(
        queryClient,
        polls => reconcilePollInPolls(polls, server),
        items => reconcilePollInFeedItems(items, server),
      );
    },
  });

  return {
    ...mutation,
    vote: mutation.mutate,
    pendingPollId: mutation.isPending ? (mutation.variables?.pollId ?? null) : null,
  };
}
