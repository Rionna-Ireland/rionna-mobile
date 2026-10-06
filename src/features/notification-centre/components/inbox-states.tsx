import { EmptyState, ErrorState, Skeleton, SkeletonGroup, SkeletonText, View } from '@/components/ui';

/** Mirrors `InboxRow`: white r8 row, tag box, two-line title, time. */
function InboxRowSkeleton() {
  return (
    <View className="gap-2 rounded-lg bg-white p-4">
      <Skeleton width={72} height={24} radius={4} />
      <SkeletonText variant="body-lg" lines={2} />
      <SkeletonText variant="body-sm" width={56} />
    </View>
  );
}

/** First load: one section label and four rows, laid out like the inbox SectionList. */
export function InboxLoading() {
  return (
    <SkeletonGroup testID="inbox-loading" className="flex-1" style={{ paddingTop: 12 }}>
      <View className="px-4 pt-5 pb-3">
        <SkeletonText variant="label-sm" width={48} />
      </View>
      <View className="gap-3 px-4">
        {[0, 1, 2, 3].map(i => <InboxRowSkeleton key={i} />)}
      </View>
    </SkeletonGroup>
  );
}

export function InboxEmpty() {
  return (
    <EmptyState
      testID="inbox-empty"
      title="You're all caught up"
      body="New activity from the club and your horses will show up here."
    />
  );
}

export function InboxUnavailable({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  return (
    <ErrorState
      testID="inbox-unavailable"
      title="Notifications unavailable"
      body="Check your connection and try again shortly."
      onRetry={onRetry}
      retrying={retrying}
    />
  );
}
