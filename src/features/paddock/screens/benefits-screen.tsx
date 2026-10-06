import type { Offer } from '@/features/paddock/types';

import Env from 'env';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import {
  BrandedRefreshControl,
  EmptyState,
  ErrorState,
  FocusAwareStatusBar,
  RefreshIndicator,
  ScreenBackground,
  ScreenHeader,
  Text,
  usePullToRefresh,
  View,
} from '@/components/ui';
import { useScreenBottomPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useOffers } from '@/features/paddock/api/use-offers';
import { OfferCard } from '@/features/paddock/components/offer-card';
import { BenefitsSkeleton } from '@/features/paddock/components/paddock-skeletons';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { translate } from '@/lib/i18n';
import { EntranceItem, isFirstLoad, SkeletonSwap, useContentEntrance } from '@/lib/motion';
import { openExternalLink } from '@/lib/open-external-link';

type BenefitsViewProps = {
  offers: Offer[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  /** Pull-to-refresh and retry; resolve when done so the branded refresher can settle. */
  onRefresh: () => unknown;
  onCopyCode: (code: string) => void;
  onOpenLink: (url: string) => void;
  onBack?: () => void;
};

export function BenefitsView({ offers, isLoading, isError, isRefetching, onRefresh, onCopyCode, onOpenLink, onBack }: BenefitsViewProps) {
  const showLoading = isLoading && !offers;
  const showUnavailable = !showLoading && isError && !offers;
  const showEmpty = !showLoading && !showUnavailable && offers?.length === 0;
  const paddingBottom = useScreenBottomPadding(24);
  const { scrollY, onScroll } = useScrollHeader();
  // A-036: the branded refresher, like Home / Stables / Events.
  const pull = usePullToRefresh(onRefresh);
  // First load only; refetches and refreshes mount new offers instantly. After a
  // skeleton, its crossfade is the entrance (S14-03).
  const entering = useContentEntrance(Boolean(offers?.length), showLoading);

  return (
    <View className="flex-1 bg-background">
      <ScreenBackground variant="page-ice" />
      <FocusAwareStatusBar />
      {/* S14-02 §5: the kicker stays fixed; its hairline fades in as the page scrolls under it. */}
      <ScreenHeader kicker={translate('paddock.benefits.kicker')} onBack={onBack} scrollY={scrollY} testID="benefits-header" />
      <View className="flex-1">
        <AnimatedScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 24, paddingBottom, gap: 32 }}
          refreshControl={<BrandedRefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Frame 13 breaks after the comma (A-020). */}
          <Text variant="display-lg" accessibilityRole="header" className="px-4">{translate('paddock.benefits.title')}</Text>
          <View className="gap-2 px-4">
            {showUnavailable
              ? <ErrorState testID="benefits-unavailable" kicker={translate('paddock.benefits.kicker')} title={translate('paddock.benefits.unavailableTitle')} body={translate('paddock.checkConnection')} onRetry={onRefresh} retrying={isRefetching} />
              : null}
            {showEmpty
              ? <EmptyState testID="benefits-empty" kicker={translate('paddock.benefits.kicker')} title={translate('paddock.benefits.emptyTitle')} body={translate('paddock.benefits.emptyBody')} />
              : null}
            <SkeletonSwap loading={showLoading} skeleton={<BenefitsSkeleton />} style={styles.list}>
              {offers?.length
                ? offers.map((offer, i) => (
                    <EntranceItem key={offer.id} entering={entering(i)}>
                      <OfferCard offer={offer} onCopyCode={onCopyCode} onOpenLink={onOpenLink} />
                    </EntranceItem>
                  ))
                : null}
            </SkeletonSwap>
          </View>
        </AnimatedScrollView>
        <RefreshIndicator scrollY={scrollY} refreshing={pull.refreshing} top={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: 8 } });

export function BenefitsScreen() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: user?.id ?? '' }),
    [user?.id],
  );
  const offers = useOffers(scope);

  const onCopyCode = async (code: string) => {
    const ok = await copyToClipboard(code);
    showMessage({
      message: ok ? translate('paddock.benefits.codeCopied') : translate('paddock.benefits.copyUnavailable'),
      type: ok ? 'success' : 'warning',
    });
  };

  return (
    <BenefitsView
      offers={offers.data?.offers}
      isLoading={isFirstLoad(offers)}
      isError={offers.isError}
      isRefetching={offers.isRefetching}
      onRefresh={() => offers.refetch()}
      onCopyCode={code => void onCopyCode(code)}
      onOpenLink={openExternalLink}
      onBack={() => router.back()}
    />
  );
}
