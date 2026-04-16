import * as React from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { useLatestNews } from '@/features/pulse/api/use-latest-news';
import { useLatestResults } from '@/features/pulse/api/use-latest-results';
import { useNextRun } from '@/features/pulse/api/use-next-run';
import { useTrainerPosts } from '@/features/pulse/api/use-trainer-posts';
import { LatestNewsTile } from '@/features/pulse/components/latest-news-tile';
import { LatestResultsTile } from '@/features/pulse/components/latest-results-tile';
import { NextRunTile } from '@/features/pulse/components/next-run-tile';
import { TrainerUpdatesTile } from '@/features/pulse/components/trainer-updates-tile';

export default function PulseScreen() {
  const nextRun = useNextRun();
  const latestResults = useLatestResults();
  const trainerPosts = useTrainerPosts();
  const latestNews = useLatestNews();

  const isRefetching
    = nextRun.isRefetching
      || latestResults.isRefetching
      || trainerPosts.isRefetching
      || latestNews.isRefetching;

  const refetchAll = React.useCallback(() => {
    nextRun.refetch();
    latestResults.refetch();
    trainerPosts.refetch();
    latestNews.refetch();
  }, [nextRun, latestResults, trainerPosts, latestNews]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetchAll} />
      }
    >
      <NextRunTile data={nextRun.data} isLoading={nextRun.isLoading} />
      <LatestResultsTile
        data={latestResults.data}
        isLoading={latestResults.isLoading}
      />
      <TrainerUpdatesTile
        data={trainerPosts.data}
        isLoading={trainerPosts.isLoading}
      />
      <LatestNewsTile
        data={latestNews.data}
        isLoading={latestNews.isLoading}
      />
    </ScrollView>
  );
}
