import * as React from 'react';
import { View } from 'react-native';

import { Card, Skeleton, SkeletonGroup, SkeletonText, SkeletonTone } from '@/components/ui';

/** Mirrors `OfferCard` (collapsed): 48pt logo, partner name, one-line subline, 44pt action circle. */
function OfferCardSkeleton() {
  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-4">
        <Skeleton width={48} height={48} radius={8} />
        <View className="flex-1">
          <SkeletonText variant="body-lg" width="55%" />
          <SkeletonText variant="body-sm" width="80%" />
        </View>
        <Skeleton width={44} height={44} radius={22} />
      </View>
    </Card>
  );
}

/** Benefits first load: four offer rows on the list's 8pt rhythm. */
export function BenefitsSkeleton() {
  return (
    <SkeletonGroup testID="benefits-loading" className="gap-2">
      {[0, 1, 2, 3].map(i => <OfferCardSkeleton key={i} />)}
    </SkeletonGroup>
  );
}

/**
 * Charity first load: the forest total card (kicker, € total, goal bar and
 * line) and the sage current-charities card. Loading state only: the total
 * card's count-up (S14-06) starts once the real card mounts.
 */
export function CharitySkeleton() {
  return (
    <SkeletonGroup testID="charity-loading" className="gap-3">
      <SkeletonTone value="dark">
        <Card variant="forest" className="gap-8">
          <View className="gap-2">
            <SkeletonText variant="label-sm" width={150} />
            <SkeletonText variant="display-xl" width="60%" />
          </View>
          <View className="gap-2">
            <Skeleton height={8} radius={4} />
            <SkeletonText variant="body-sm" width="70%" />
          </View>
        </Card>
      </SkeletonTone>
      <Card variant="sage" className="gap-4">
        <SkeletonText variant="label-sm" width={120} />
        <SkeletonText variant="body-lg" lines={2} />
      </Card>
    </SkeletonGroup>
  );
}

/** A Paddock hub row's subtitle while its count/total is on its first load. */
export function HubSubtitleSkeleton() {
  return (
    <SkeletonGroup>
      <SkeletonText variant="body-sm" width="60%" />
    </SkeletonGroup>
  );
}
