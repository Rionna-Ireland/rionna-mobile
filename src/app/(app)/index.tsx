import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Image } from '@/components/ui';

import { Menu } from '@/components/ui/icons';
import { useLatestNews } from '@/features/pulse/api/use-latest-news';
import { useLatestResults } from '@/features/pulse/api/use-latest-results';
import { useNextRun } from '@/features/pulse/api/use-next-run';
import { useTrainerPosts } from '@/features/pulse/api/use-trainer-posts';
import { NextRunTile } from '@/features/pulse/components/next-run-tile';

import { TrainerUpdatesTile } from '@/features/pulse/components/trainer-updates-tile';

function NewsCards({ items }: { items: ReturnType<typeof useLatestNews>['data'] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 16 }}
    >
      {items?.map(news => (
        <Pressable key={news.id} className="w-64 rounded-xl border border-neutral-100 bg-white p-3 shadow-sm">
          <View className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
            {news.featuredImageUrl && (
              <Image source={{ uri: `${news.featuredImageUrl}?width=400&quality=80` }} className="size-full" contentFit="cover" />
            )}
          </View>
          <View className="px-1 py-4">
            <Text className="font-display text-2xl text-black" numberOfLines={2}>
              {news.title}
            </Text>
            <Text className="mt-4 font-mono text-[10px] tracking-widest text-pink-300 uppercase">
              {news.publishedAt ? '7 min read' : '12 min read'}
            </Text>
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
      className="flex-1 bg-[#fcf9f2]"
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} />}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
        <Pressable className="size-10 items-center justify-center rounded-full border border-neutral-100 bg-white shadow-sm">
          <Menu color="#000" />
        </Pressable>
        <Text className="font-display text-2xl tracking-tight text-black">
          Rionna
        </Text>
        <Pressable className="size-10 items-center justify-center rounded-full border border-neutral-100 bg-white shadow-sm">
          <Menu color="#000" />
        </Pressable>
      </View>

      {/* Hero Text */}
      <View className="p-6">
        <Text className="font-display text-7xl text-black" style={{ lineHeight: 74 }}>
          A
          {' '}
          <Text className="text-pink-700">new</Text>
          {' '}
          way
          {'\n'}
          into
          {' '}
          <Text className="text-pink-700">racing.</Text>
        </Text>
        <Text className="mt-8 font-sans text-xl/relaxed font-medium text-[#4d444b]">
          Follow the journey,
          {'\n'}
          from training to race day
        </Text>
      </View>

      {/* Section: From the stable */}
      <View className="mt-8 px-6">
        <View className="flex-row items-end justify-between border-b border-neutral-200/50 pb-4">
          <Text className="font-display text-4xl text-black">
            From the stable
          </Text>
          <Text className="mb-1 font-sans text-sm font-semibold text-neutral-500">
            See All
          </Text>
        </View>

        {/* Tab Pills */}
        <View className="mt-4 flex-row gap-3">
          <View className="rounded-sm bg-pink-300 px-4 py-2">
            <Text className="font-mono text-[10px] font-bold tracking-widest text-pink-950 uppercase">
              Latest Stories
            </Text>
          </View>
          <View className="rounded-sm bg-[#e5e2db] px-4 py-2">
            <Text className="font-mono text-[10px] font-bold tracking-widest text-[#4d444b] uppercase">
              Events
            </Text>
          </View>
          <View className="rounded-sm bg-[#e5e2db] px-4 py-2">
            <Text className="font-mono text-[10px] font-bold tracking-widest text-[#4d444b] uppercase">
              Locations
            </Text>
          </View>
        </View>
      </View>

      <NewsCards items={latestNews.data} />

      {/* Retain core app functionality by rendering remaining dashboard data */}
      <View className="mt-4 gap-6 px-6 pb-12">
        {nextRun.data && <NextRunTile data={nextRun.data} isLoading={nextRun.isLoading} />}
        {trainerPosts.data && trainerPosts.data.length > 0 && <TrainerUpdatesTile data={trainerPosts.data} isLoading={trainerPosts.isLoading} />}
      </View>
    </ScrollView>
  );
}
