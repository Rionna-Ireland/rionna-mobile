import type { Poll } from '@/features/polls/types';

import Env from 'env';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import { EmptyState, ErrorState, FocusAwareStatusBar, ScreenBackground, ScreenHeader, ScrollView, View } from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useActivePolls } from '@/features/polls/api/use-active-polls';
import { usePollVote } from '@/features/polls/api/use-poll-vote';
import { PollCard } from '@/features/polls/components/poll-card';
import { PollCardSkeleton } from '@/features/polls/components/poll-skeleton';
import { translate } from '@/lib/i18n';
import { SkeletonSwap } from '@/lib/motion';

type PollScreenViewProps = {
  poll: Poll | undefined;
  isLoading: boolean;
  /** The polls failed to load: an error with retry, never "This vote has ended" (A-044). */
  isError?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
  onVote: (pollId: string, optionId: string) => void;
  pendingPollIds: string[];
  onBack?: () => void;
};

function PollMissing({ isError, onRetry, retrying }: Pick<PollScreenViewProps, 'isError' | 'onRetry' | 'retrying'>) {
  if (isError && onRetry) {
    return (
      <ErrorState
        testID="poll-unavailable"
        title={translate('polls.unavailableTitle')}
        body={translate('community.post.unavailableBody')}
        onRetry={onRetry}
        retrying={retrying}
      />
    );
  }
  return <EmptyState title={translate('polls.endedTitle')} body={translate('polls.endedBody')} />;
}

export function PollScreenView({ poll, isLoading, isError = false, onRetry, retrying, onVote, pendingPollIds, onBack }: PollScreenViewProps) {
  const loading = isLoading && !poll;
  return (
    <View className="flex-1 bg-background">
      <ScreenBackground />
      <FocusAwareStatusBar />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader kicker={translate('polls.clubVote')} onBack={onBack} />
        <View className="mt-6 px-4">
          <SkeletonSwap loading={loading} skeleton={<PollCardSkeleton />}>
            {poll
              ? <PollCard poll={poll} onVote={onVote} pending={pendingPollIds.includes(poll.id)} variant="card" />
              : <PollMissing isError={isError} onRetry={onRetry} retrying={retrying} />}
          </SkeletonSwap>
        </View>
      </ScrollView>
    </View>
  );
}

export function PollScreen() {
  const router = useRouter();
  const { 'poll-id': pollId } = useLocalSearchParams<{ 'poll-id': string }>();
  const user = useAuthStore.use.user();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: user?.id ?? '' }),
    [user?.id],
  );
  const polls = useActivePolls(scope);
  const { vote, pendingPollIds } = usePollVote(scope);
  const poll = polls.data?.polls.find(p => p.id === pollId);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PollScreenView
        poll={poll}
        isLoading={polls.isLoading}
        isError={polls.isError && !polls.data}
        onRetry={() => void polls.refetch()}
        retrying={polls.isRefetching}
        onVote={(id, optionId) => vote({ pollId: id, optionId })}
        pendingPollIds={pendingPollIds}
        onBack={() => router.back()}
      />
    </>
  );
}
