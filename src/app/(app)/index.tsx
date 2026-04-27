import type { CircleFeedItem } from '@/features/pulse/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Image } from '@/components/ui';
import { useCircleFeed } from '@/features/pulse/api/use-circle-feed';
import { useLatestResults } from '@/features/pulse/api/use-latest-results';
import { useNextRun } from '@/features/pulse/api/use-next-run';
import { useTrainerPosts } from '@/features/pulse/api/use-trainer-posts';
import { CommunityFeedTile } from '@/features/pulse/components/community-feed-tile';
import { LatestResultsTile } from '@/features/pulse/components/latest-results-tile';
import { NextRunTile } from '@/features/pulse/components/next-run-tile';
import { TrainerUpdatesTile } from '@/features/pulse/components/trainer-updates-tile';

function openCommunity(router: ReturnType<typeof useRouter>, url: string | null) {
  router.push({
    pathname: '/community-view',
    params: url ? { url } : {},
  });
}

function FeaturedCircleNews({ items }: { items: CircleFeedItem[] | undefined }) {
  const router = useRouter();

  if (!items || items.length === 0)
    return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12, gap: 14 }}
    >
      {items.map(item => (
        <Pressable
          key={item.id}
          onPress={() => openCommunity(router, item.url)}
          className="w-72 overflow-hidden rounded-2xl bg-primary"
        >
          {item.imageUrl
            ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="aspect-video w-full"
                  contentFit="cover"
                />
              )
            : null}
          <View className="p-5">
            <Text className="font-mono text-[10px] tracking-wider uppercase" style={{ color: '#fcf9f2' }}>
              {item.spaceName ?? 'Club news'}
            </Text>
            <Text className="mt-4 font-display text-3xl text-white" numberOfLines={3}>
              {item.title}
            </Text>
            {item.excerpt && (
              <Text className="mt-4 font-sans text-sm/5 text-white/80" numberOfLines={3}>
                {item.excerpt}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function PulseScreen() {
  const nextRun = useNextRun();
  const latestResults = useLatestResults();
  const trainerPosts = useTrainerPosts();
  const circleFeed = useCircleFeed();

  const circleNews = React.useMemo(
    () => circleFeed.data?.filter(item => item.kind === 'news').slice(0, 4),
    [circleFeed.data],
  );
  const circlePosts = React.useMemo(
    () => circleFeed.data?.filter(item => item.kind === 'post').slice(0, 5),
    [circleFeed.data],
  );
  const circleFeedHasData = Boolean(circleFeed.data?.length);
  const circleFeedLoadFailed = circleFeed.isError && !circleFeedHasData;

  const isRefetching
    = nextRun.isRefetching
      || latestResults.isRefetching
      || trainerPosts.isRefetching
      || circleFeed.isRefetching;

  const refetchAll = React.useCallback(() => {
    nextRun.refetch();
    latestResults.refetch();
    trainerPosts.refetch();
    circleFeed.refetch();
  }, [nextRun, latestResults, trainerPosts, circleFeed]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 128 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} />}
    >
      <View className="px-6 pt-16 pb-6">
        <Text className="font-mono text-xs tracking-wider text-primary uppercase">
          Member hub
        </Text>
        <Text className="mt-3 font-display text-5xl text-ink">
          Pulse
        </Text>
        <Text className="mt-3 font-sans text-base/6 text-ink-variant">
          Latest from the yard, the clubhouse, and the community.
        </Text>

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-surface-container-lowest p-4">
            <Text className="font-mono text-[10px] tracking-wider text-ink-variant uppercase">
              Status
            </Text>
            <Text className="mt-2 font-sans text-lg font-semibold text-ink">
              Active
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-surface-container-lowest p-4">
            <Text className="font-mono text-[10px] tracking-wider text-ink-variant uppercase">
              Feed
            </Text>
            <Text className="mt-2 font-sans text-lg font-semibold text-ink">
              Circle
            </Text>
          </View>
        </View>
      </View>

      <FeaturedCircleNews items={circleNews} />

      <View className="mt-4 gap-6 px-6 pb-12">
        {nextRun.data && <NextRunTile data={nextRun.data} isLoading={nextRun.isLoading} />}
        <CommunityFeedTile
          title="Club News"
          data={circleNews}
          emptyMessage="No Circle news posts yet"
          isLoading={circleFeed.isLoading}
          isError={circleFeedLoadFailed}
          errorMessage="Could not load Circle news"
        />
        <CommunityFeedTile
          title="Community Posts"
          data={circlePosts}
          emptyMessage="No community posts yet"
          isLoading={circleFeed.isLoading}
          isError={circleFeedLoadFailed}
          errorMessage="Could not load Circle posts"
        />
        {trainerPosts.data && trainerPosts.data.length > 0 && (
          <TrainerUpdatesTile data={trainerPosts.data} isLoading={trainerPosts.isLoading} />
        )}
        <LatestResultsTile data={latestResults.data} isLoading={latestResults.isLoading} />
      </View>
    </ScrollView>
  );
}
