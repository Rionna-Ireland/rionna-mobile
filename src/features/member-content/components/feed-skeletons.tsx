import * as React from 'react';
import { View } from 'react-native';

import { Card, Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui';

/** Mirrors `MemberFeedCard`: author row (41pt avatar, name, time), title, three-line excerpt, activity row. */
export function PostCardSkeleton() {
  return (
    <Card className="gap-3 border border-outline-variant">
      <View className="flex-row items-center gap-2">
        <Skeleton width={41} height={41} radius={20.5} />
        <View className="flex-1 gap-0.5">
          <SkeletonText variant="title" width="45%" />
          <SkeletonText variant="body-sm" width={64} />
        </View>
      </View>
      <SkeletonText variant="title" width="70%" />
      <SkeletonText variant="body-lg" lines={3} />
      <View className="flex-row items-center gap-4">
        <SkeletonText variant="body" width={40} />
        <SkeletonText variant="body" width={40} />
      </View>
    </Card>
  );
}

/** A feed's first load: three post cards on the feed's 12pt rhythm. */
export function FeedSkeleton({ testID = 'member-feed-loading' }: { testID?: string }) {
  return (
    <SkeletonGroup testID={testID} className="gap-3">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </SkeletonGroup>
  );
}
