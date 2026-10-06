import type { Charity } from '@/features/paddock/types';
import type { Poll } from '@/features/polls/types';

import Env from 'env';
import { useRouter } from 'expo-router';
import * as React from 'react';

import {
  BrandedRefreshControl,
  EmptyState,
  ErrorState,
  FocusAwareStatusBar,
  RefreshIndicator,
  ScreenHeader,
  usePullToRefresh,
  View,
} from '@/components/ui';
import { useScreenBottomPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useCharity } from '@/features/paddock/api/use-charity';
import { CharityStoryCard } from '@/features/paddock/components/charity-story-card';
import { CharityTotalCard } from '@/features/paddock/components/charity-total-card';
import { CharityVoteCard } from '@/features/paddock/components/charity-vote-card';
import { CurrentCharitiesCard } from '@/features/paddock/components/current-charities-card';
import { CharitySkeleton } from '@/features/paddock/components/paddock-skeletons';
import { currentCharities } from '@/features/paddock/lib/current-charities';
import { useActivePolls } from '@/features/polls/api/use-active-polls';
import { usePollVote } from '@/features/polls/api/use-poll-vote';
import { translate } from '@/lib/i18n';
import { isFirstLoad, SkeletonSwap } from '@/lib/motion';
import { openExternalLink } from '@/lib/open-external-link';

type CharityViewProps = {
  charity: Charity | null | undefined;
  poll: Poll | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  /** Pull-to-refresh and retry; resolve when done so the branded refresher can settle. */
  onRefresh: () => unknown;
  onOpenStory: (slug: string) => void;
  onOpenWebsite: (url: string) => void;
  onVote: (pollId: string, optionId: string) => void;
  pendingPollIds: string[];
  onBack?: () => void;
};

function CharityBody({ charity, poll, onOpenStory, onOpenWebsite, onVote, pendingPollIds }: Omit<CharityViewProps, 'isLoading' | 'isError' | 'isRefetching' | 'onRefresh' | 'onBack'> & { charity: Charity }) {
  const story = charity.stories[0];
  return (
    <View className="gap-3">
      <CharityTotalCard charity={charity} />
      <CurrentCharitiesCard charities={currentCharities(charity)} onOpen={onOpenWebsite} />
      {story ? <CharityStoryCard story={story} onOpen={onOpenStory} /> : null}
      {poll ? <CharityVoteCard poll={poll} onVote={onVote} pending={pendingPollIds.includes(poll.id)} /> : null}
    </View>
  );
}

export function CharityView(props: CharityViewProps) {
  const { charity, isLoading, isError, isRefetching, onRefresh, onBack } = props;
  const showLoading = isLoading && charity === undefined;
  const showUnavailable = !showLoading && isError && charity === undefined;
  const showEmpty = !showLoading && !showUnavailable && charity === null;
  const paddingBottom = useScreenBottomPadding(24);
  const { scrollY, onScroll } = useScrollHeader();
  // A-036: the branded refresher, like Home / Stables / Events.
  const pull = usePullToRefresh(onRefresh);

  return (
    <View className="flex-1 bg-secondary-container">
      <FocusAwareStatusBar />
      {/* S14-02 §5: the kicker stays fixed; its hairline fades in as the page scrolls under it. */}
      <ScreenHeader kicker={translate('paddock.charity.kicker')} onBack={onBack} scrollY={scrollY} testID="charity-header" />
      <View className="flex-1">
        <AnimatedScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 32, paddingBottom, gap: 32 }}
          refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View className="px-4">
            {showUnavailable
              ? <ErrorState testID="charity-unavailable" kicker={translate('paddock.charity.kicker')} title={translate('paddock.charity.unavailableTitle')} body={translate('paddock.checkConnection')} onRetry={onRefresh} retrying={isRefetching} />
              : null}
            {showEmpty
              ? <EmptyState testID="charity-empty" kicker={translate('paddock.charity.kicker')} title={translate('paddock.comingSoon')} body={translate('paddock.charity.emptyBody')} />
              : null}
            <SkeletonSwap loading={showLoading} skeleton={<CharitySkeleton />}>
              {charity ? <CharityBody {...props} charity={charity} /> : null}
            </SkeletonSwap>
          </View>
        </AnimatedScrollView>
        <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={0} />
      </View>
    </View>
  );
}

export function CharityScreen() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: user?.id ?? '' }),
    [user?.id],
  );
  const charity = useCharity(scope);
  const polls = useActivePolls(scope);
  const { vote, pendingPollIds } = usePollVote(scope);
  const pollId = charity.data?.charity?.pollId ?? null;
  const poll = pollId ? polls.data?.polls.find(p => p.id === pollId) : undefined;

  return (
    <CharityView
      charity={charity.data?.charity}
      poll={poll}
      isLoading={isFirstLoad(charity)}
      isError={charity.isError}
      isRefetching={charity.isRefetching}
      onRefresh={() => Promise.all([charity.refetch(), polls.refetch()])}
      onOpenStory={slug => router.push(`/news/${slug}`)}
      onOpenWebsite={openExternalLink}
      onVote={(id, optionId) => vote({ pollId: id, optionId })}
      pendingPollIds={pendingPollIds}
      onBack={() => router.back()}
    />
  );
}
