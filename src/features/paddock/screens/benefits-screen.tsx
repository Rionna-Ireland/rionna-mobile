import type { Offer } from '@/features/paddock/types';

import Env from 'env';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import {
  ActivityIndicator,
  EmptyState,
  ErrorState,
  FocusAwareStatusBar,
  ScreenBackground,
  ScreenHeader,
  Text,
  View,
} from '@/components/ui';
import { useScreenBottomPadding } from '@/components/ui/screen-layout';
import { AnimatedScrollView, useScrollHeader } from '@/components/ui/scroll-header';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useOffers } from '@/features/paddock/api/use-offers';
import { OfferCard } from '@/features/paddock/components/offer-card';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';
import { openExternalLink } from '@/lib/open-external-link';

type BenefitsViewProps = {
  offers: Offer[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
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
  // First load only; refetches and refreshes mount new offers instantly.
  const entering = useFirstLoadEntrance(Boolean(offers?.length));

  return (
    <View className="flex-1 bg-background">
      <ScreenBackground variant="page-ice" />
      <FocusAwareStatusBar />
      {/* S14-02 §5: the kicker stays fixed; its hairline fades in as the page scrolls under it. */}
      <ScreenHeader kicker="BENEFITS" onBack={onBack} scrollY={scrollY} testID="benefits-header" />
      <AnimatedScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 24, paddingBottom, gap: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Text variant="display-lg" accessibilityRole="header" className="px-4">The good life, members’ rates</Text>
        <View className="gap-2 px-4">
          {showLoading
            ? (
                <View testID="benefits-loading" className="items-center py-16"><ActivityIndicator /></View>
              )
            : null}
          {showUnavailable
            ? <ErrorState testID="benefits-unavailable" kicker="BENEFITS" title="Offers unavailable" body="Check your connection and try again." onRetry={onRefresh} retrying={isRefetching} />
            : null}
          {showEmpty
            ? <EmptyState testID="benefits-empty" kicker="BENEFITS" title="New partners are on the way" body="Partner offers will appear here as the club adds them." />
            : null}
          {offers?.map((offer, i) => (
            <EntranceItem key={offer.id} entering={entering(i)}>
              <OfferCard offer={offer} onCopyCode={onCopyCode} onOpenLink={onOpenLink} />
            </EntranceItem>
          ))}
        </View>
      </AnimatedScrollView>
    </View>
  );
}

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
      message: ok ? 'Code copied' : 'Copy unavailable — long-press the code to select it',
      type: ok ? 'success' : 'warning',
    });
  };

  return (
    <BenefitsView
      offers={offers.data?.offers}
      isLoading={offers.isLoading}
      isError={offers.isError}
      isRefetching={offers.isRefetching}
      onRefresh={() => void offers.refetch()}
      onCopyCode={code => void onCopyCode(code)}
      onOpenLink={openExternalLink}
      onBack={() => router.back()}
    />
  );
}
