import * as React from 'react';

import { Card, Skeleton, SkeletonGroup, SkeletonText, View } from '@/components/ui';

function OptionRowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-outline-variant bg-white p-3">
      <Skeleton width={20} height={20} radius={4} />
      <SkeletonText variant="body" width="55%" />
    </View>
  );
}

/** The poll screen's first load (S14-08 A-015): `PollCard` (`card`) with three option rows. */
export function PollCardSkeleton() {
  return (
    <SkeletonGroup testID="poll-loading">
      <Card className="gap-4 border border-outline-variant">
        <View className="gap-2">
          <SkeletonText variant="label" width={72} />
          <SkeletonText variant="display-sm" width="75%" />
        </View>
        <View className="gap-3">
          <OptionRowSkeleton />
          <OptionRowSkeleton />
          <OptionRowSkeleton />
        </View>
        <SkeletonText variant="body-sm" lines={2} />
      </Card>
    </SkeletonGroup>
  );
}
