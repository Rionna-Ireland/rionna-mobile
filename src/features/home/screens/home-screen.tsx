import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl } from 'react-native';

import {
  FocusAwareStatusBar,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { HeadlineCard } from '@/features/home/components/headline-card';
import { selectHeadline } from '@/features/home/lib/select-headline';
import { useLatestNews } from '@/features/pulse/api/use-latest-news';
import { useLatestResults } from '@/features/pulse/api/use-latest-results';
import { useNextRun } from '@/features/pulse/api/use-next-run';
import { useTrainerPosts } from '@/features/pulse/api/use-trainer-posts';
import { LatestNewsTile } from '@/features/pulse/components/latest-news-tile';
import { LatestResultsTile } from '@/features/pulse/components/latest-results-tile';
import { NextRunTile } from '@/features/pulse/components/next-run-tile';
import { TrainerUpdatesTile } from '@/features/pulse/components/trainer-updates-tile';

export function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const contentPaddingBottom = useTabBarContentPadding(24);

  const nextRun = useNextRun();
  const results = useLatestResults();
  const news = useLatestNews();
  const trainerPosts = useTrainerPosts();

  const headline = selectHeadline(
    {
      nextRun: nextRun.data,
      latestResult: results.data?.[0] ?? null,
      latestNews: news.data?.[0] ?? null,
    },
    new Date(),
  );

  const isRefetching
    = nextRun.isRefetching
      || results.isRefetching
      || news.isRefetching
      || trainerPosts.isRefetching;
  const onRefresh = () => {
    void nextRun.refetch();
    void results.refetch();
    void news.refetch();
    void trainerPosts.refetch();
  };

  const displayName = user?.name?.trim() || 'Rionna member';

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: contentPaddingBottom,
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="font-mono text-[10px] tracking-widest text-violet-700 uppercase">
              Rionna Ireland
            </Text>
            <Text className="mt-2 font-sans text-3xl font-semibold text-ink">Home</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            testID="home-avatar"
            onPress={() => router.push('/profile')}
            className="size-11 items-center justify-center rounded-full border border-neutral-400 bg-white"
          >
            <Text className="font-sans text-base font-semibold text-neutral-950">
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <View className="gap-6">
          <HeadlineCard headline={headline} />
          <NextRunTile data={nextRun.data} isLoading={nextRun.isLoading} />
          <LatestResultsTile data={results.data} isLoading={results.isLoading} />
          <TrainerUpdatesTile data={trainerPosts.data} isLoading={trainerPosts.isLoading} />
          <LatestNewsTile data={news.data} isLoading={news.isLoading} />
        </View>
      </ScrollView>
    </>
  );
}
