import * as React from 'react';
import { View } from 'react-native';

import { Card, Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui';

function AuthorRowSkeleton() {
  return (
    <View className="flex-row items-center gap-2">
      <Skeleton width={41} height={41} radius={20.5} />
      <View className="flex-1 gap-0.5">
        <SkeletonText variant="title" width="45%" />
        <SkeletonText variant="body-sm" width={64} />
      </View>
    </View>
  );
}

function CommentSkeleton() {
  return (
    <Card variant="white" className="gap-3">
      <AuthorRowSkeleton />
      <SkeletonText variant="body-lg" lines={2} />
    </Card>
  );
}

/**
 * The thread's first load (S14-08 A-015): mirrors `PostCard` (author row,
 * title, three body lines, activity row), the Replies label and two comment
 * cards, on the thread's own padding so the crossfade moves nothing.
 */
export function ThreadSkeleton() {
  return (
    <SkeletonGroup testID="member-post-loading" className="px-4 pt-2">
      <Card className="gap-4 border border-on-primary-container">
        <AuthorRowSkeleton />
        <SkeletonText variant="display-sm" width="80%" />
        <SkeletonText variant="body-lg" lines={3} />
        <View className="flex-row items-center gap-4">
          <SkeletonText variant="body" width={40} />
          <SkeletonText variant="body" width={40} />
        </View>
      </Card>
      <View className="mt-4 gap-3">
        <SkeletonText variant="label" width={88} />
        <CommentSkeleton />
        <CommentSkeleton />
      </View>
    </SkeletonGroup>
  );
}
