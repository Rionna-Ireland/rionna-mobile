import type { QueryClient } from '@tanstack/react-query';

import type { MemberContentScope } from '@/features/member-content/types';
import type { ActivePollsResult, Poll, PollVoteResult, PollVoteVariables } from '@/features/polls/types';

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

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
    const nextPolls = patchPolls(data.polls);
    if (nextPolls === data.polls)
      continue;
    snapshots.push({ queryKey, data });
    queryClient.setQueryData(queryKey, { ...data, polls: nextPolls });
  }
  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] })) {
    if (!isFeedItems(data))
      continue;
    const nextItems = patchFeed(data);
    if (nextItems === data)
      continue;
    snapshots.push({ queryKey, data });
    queryClient.setQueryData(queryKey, nextItems);
  }
  return snapshots;
}

export function usePollVote(scope: MemberContentScope) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: [POLLS_QUERY_ROOT, 'vote'],
    mutationFn: (variables: PollVoteVariables) => sendVote(scope, variables),
    onMutate: async ({ pollId, optionId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: [POLLS_QUERY_ROOT] }),
        queryClient.cancelQueries({ queryKey: [MEMBER_CONTENT_QUERY_ROOT] }),
      ]);
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
  const pendingIds = useMutationState({
    filters: { mutationKey: [POLLS_QUERY_ROOT, 'vote'], status: 'pending' },
    select: activeMutation => (activeMutation.state.variables as PollVoteVariables | undefined)?.pollId ?? null,
  });
  const pendingPollId = pendingIds.find((pollId): pollId is string => pollId !== null) ?? null;
  const vote = useCallback((variables: PollVoteVariables) => {
    if (pendingIds.includes(variables.pollId))
      return;
    mutation.mutate(variables);
  }, [mutation, pendingIds]);

  return {
    ...mutation,
    vote,
    pendingPollId,
  };
}
