import type { StyleProp, ViewStyle } from 'react-native';

import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';

import {
  Card,
  MonoLabel,
  Skeleton,
  skeletonA11yProps,
  SkeletonChipRow,
  SkeletonGroup,
  SkeletonText,
  SkeletonTone,
  Text,
} from '@/components/ui';
import { translate } from '@/lib/i18n';

/** Mirrors `HorseCard`: 86×146 photo, name, two fact lines, then the 30pt pill row. */
export function HorseCardSkeleton() {
  return (
    <Card className="flex-row gap-4 border border-outline-variant">
      <Skeleton width={86} height={146} radius={8} />
      <View className="flex-1 justify-between gap-4">
        <View className="gap-2">
          <SkeletonText variant="display-sm" width="70%" />
          <View className="gap-1">
            <SkeletonText variant="body-sm" width="85%" />
            <SkeletonText variant="body-sm" width="55%" />
          </View>
        </View>
        <View className="flex-row gap-1">
          <Skeleton height={30} radius={6} className="flex-1" />
          <Skeleton height={30} radius={6} className="flex-1" />
        </View>
      </View>
    </Card>
  );
}

/**
 * Stables first load: the real (static) title block, the chip row and four
 * horse cards, laid out exactly like the list's header and rows.
 */
export function StablesSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonGroup announce={false} testID="stables-skeleton" className="flex-1 px-4" style={style}>
      <View className="gap-8 pb-3">
        <View className="gap-2">
          <Text variant="display-lg" accessibilityRole="header">{translate('stables.list.title')}</Text>
          <Text variant="body">{translate('stables.list.subtitle')}</Text>
        </View>
        <View className="gap-2.5">
          <MonoLabel>{translate('stables.list.kicker')}</MonoLabel>
          <View className="-mx-4">
            <SkeletonChipRow contentInset={16} />
          </View>
        </View>
      </View>
      <View className="gap-2" {...skeletonA11yProps()}>
        {[0, 1, 2, 3].map(i => <HorseCardSkeleton key={i} />)}
      </View>
    </SkeletonGroup>
  );
}

/** A section card: kicker plus a few body lines. */
function SectionSkeleton({ lines }: { lines: number }) {
  return (
    <View className="px-4 pb-2">
      <Card className="gap-3">
        <SkeletonText variant="label-sm" width={80} />
        <SkeletonText variant="body" lines={lines} />
      </Card>
    </View>
  );
}

/**
 * Horse detail first load: the navy hero frame (square, same padding and
 * name / fact lines / pill row as `HorseHero`), the section chips, then two
 * section cards.
 */
export function HorseDetailSkeleton({ heroTopPadding }: { heroTopPadding: number }) {
  const { width } = useWindowDimensions();
  return (
    <SkeletonGroup testID="horse-detail-skeleton">
      <View className="bg-primary" style={{ minHeight: width }}>
        <SkeletonTone value="dark">
          <View style={{ paddingTop: heroTopPadding, minHeight: width }} className="justify-between gap-8 px-4 pb-8">
            <View className="h-11" />
            <View className="gap-6">
              <View className="gap-2">
                <SkeletonText variant="display-lg" width="65%" />
                <SkeletonText variant="body" width="80%" />
                <SkeletonText variant="body" width="50%" />
              </View>
              <View className="flex-row gap-1">
                <Skeleton height={30} radius={6} className="flex-1" />
                <Skeleton height={30} radius={6} className="flex-1" />
              </View>
            </View>
          </View>
        </SkeletonTone>
      </View>
      <View className="pt-5 pb-3">
        <SkeletonChipRow count={4} contentInset={16} />
      </View>
      <SectionSkeleton lines={4} />
      <SectionSkeleton lines={3} />
    </SkeletonGroup>
  );
}
