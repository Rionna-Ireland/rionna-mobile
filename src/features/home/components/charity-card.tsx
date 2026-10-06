import type { CharityResult } from '@/features/paddock/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Card, IconButton, MonoLabel, Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { WalletV2 } from '@/components/ui/icons/v2';
import { formatEuro } from '@/features/paddock/lib/format-euro';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';

/**
 * S13-03 §7: plum pattern card with the € total in lilac. Hidden when no
 * charity is configured (and on error/offline), per the S11-01 rule.
 */
export function CharityCard({ data, entranceIndex }: { data: CharityResult | undefined; entranceIndex: number }) {
  const router = useRouter();
  const charity = data?.charity;
  // Fades up the first time it has something to show (S14-02 §6).
  const entering = useFirstLoadEntrance(Boolean(charity))(entranceIndex);
  if (!charity)
    return null;

  return (
    <EntranceItem entering={entering}>
      <Card variant="plum" testID="home-charity" className="min-h-[204px] justify-between">
        <View className="gap-2.5">
          <MonoLabel tone="white">Charity snapshot</MonoLabel>
          <Text variant="display-xl" className="text-primary-fixed" numberOfLines={1} adjustsFontSizeToFit>
            {formatEuro(charity.totalCents)}
          </Text>
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
    </EntranceItem>
  );
}
