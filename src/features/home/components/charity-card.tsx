import type { SharedValue } from 'react-native-reanimated';
import type { TileSpec } from '@/components/brand/pattern';
import type { Charity, CharityResult } from '@/features/paddock/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PatternWave } from '@/components/brand/pattern';
import { Card, IconButton, MonoLabel, Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { WalletV2 } from '@/components/ui/icons/v2';
import { useVisibleOnce } from '@/features/home/lib/use-visible-once';
import { CharityTotalText } from '@/features/paddock/components/charity-total-text';
import { useCharityCounter } from '@/features/paddock/lib/use-charity-counter';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';

/** The plum harlequin with its spurs lit lilac (S14-06 wave). */
const PLUM_LIT: TileSpec = { kind: 'harlequin', colourway: 'plumLit', turn: 0 };

type Props = {
  data: CharityResult | undefined;
  entranceIndex: number;
  /** Home's scroll offset: the moment starts once the card is ≥60% visible. */
  scrollY: SharedValue<number>;
};

/**
 * S13-03 §7: plum pattern card with the € total in lilac. Hidden when no
 * charity is configured (and on error/offline), per the S11-01 rule.
 */
export function CharityCard({ data, entranceIndex, scrollY }: Props) {
  const charity = data?.charity;
  // Fades up the first time it has something to show (S14-02 §6).
  const entering = useFirstLoadEntrance(Boolean(charity))(entranceIndex);
  if (!charity)
    return null;

  return (
    <EntranceItem entering={entering}>
      <HomeCharityCard charity={charity} scrollY={scrollY} />
    </EntranceItem>
  );
}

/**
 * S14-06: once the card is ≥60% on screen (once per session) the total
 * counts up from the member's last-seen total, and an increase lights the
 * plum pattern in a wave.
 */
function HomeCharityCard({ charity, scrollY }: { charity: Charity; scrollY: SharedValue<number> }) {
  const router = useRouter();
  const counter = useCharityCounter('home', charity.totalCents);
  const { ref, onLayout } = useVisibleOnce(scrollY, counter.start);

  return (
    <Animated.View ref={ref} onLayout={onLayout}>
      <Card
        variant="plum"
        testID="home-charity"
        className="min-h-[204px] justify-between"
        patternOverlay={counter.waveArmed ? <PatternWave spec={PLUM_LIT} clock={counter.wave} borderRadius={8} testID="home-charity-wave" /> : null}
      >
        <View className="gap-2.5">
          <MonoLabel tone="white">Charity snapshot</MonoLabel>
          <CharityTotalText
            counter={counter}
            totalCents={charity.totalCents}
            color={colors.primaryFixed}
            className="text-primary-fixed"
            fit
            testID="home-charity-amount"
          />
        </View>
        <View className="flex-row items-end justify-between gap-4">
          <Text variant="body-sm" className="flex-1 text-white">{`raised for ${charity.charityName}`}</Text>
          <IconButton
            variant="square-accent"
            accessibilityLabel="Open charity"
            testID="home-charity-open"
            onPress={() => router.push('/paddock/charity')}
          >
            <WalletV2 size={24} color={colors.plum} />
          </IconButton>
        </View>
      </Card>
    </Animated.View>
  );
}
