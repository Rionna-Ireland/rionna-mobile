import Env from 'env';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useHorse } from '@/features/stables/api/use-horse';
import { NextEntryCard } from '@/features/stables/components/next-entry-card';
import { ResultRow } from '@/features/stables/components/result-row';

type Horse = NonNullable<ReturnType<typeof useHorse>['data']>;

function HorseHero({ horse }: { horse: Horse }) {
  return (
    <View className="px-6 pt-8 pb-6">
      <View className="relative mb-6">
        <View className="aspect-4/5 overflow-hidden rounded-2xl border border-neutral-200 shadow-xl">
          {horse.photos[0]
            ? (
                <Image
                  source={{ uri: `${horse.photos[0].url}?width=800&quality=80` }}
                  className="size-full"
                  contentFit="cover"
                />
              )
            : (
                <View className="flex-1 bg-neutral-200" />
              )}
        </View>
        <View className="absolute -right-2 -bottom-6 hidden rounded-xl bg-primary p-6 shadow-xl md:flex">
          <Text className="font-display text-2xl text-white italic">The Jewel of</Text>
          <Text className="font-display text-3xl text-white">Rionna</Text>
        </View>
      </View>
      <View className="mt-8">
        <Text className="mb-2 font-mono text-[10px] tracking-widest text-primary uppercase">
          Equestrian Profile
        </Text>
        <Text className="mb-4 font-display text-6xl text-primary">
          {horse.name}
        </Text>
        <View className="mb-6 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-neutral-200/50 px-3 py-1.5">
            <Text className="font-mono text-[10px] tracking-widest text-primary uppercase">
              {horse.status}
            </Text>
          </View>
        </View>
        {horse.bio
          ? (
              <Text className="font-display text-xl/relaxed text-[#4d444b]">
                {horse.bio}
              </Text>
            )
          : null}
      </View>
    </View>
  );
}

export default function HorseProfileScreen() {
  const params = useLocalSearchParams<{ 'horse-id': string }>();
  const horseId = params['horse-id'];
  const { data: horse, isLoading, isError } = useHorse(horseId);
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fcf9f2]">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !horse) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fcf9f2] p-4">
        <Text className="text-center font-sans text-neutral-500">
          Horse not found.
        </Text>
      </View>
    );
  }

  const nextEntry = horse.entries?.find(
    e => e.status === 'DECLARED' || e.status === 'ENTERED',
  );
  const results = horse.entries?.filter(e => e.status === 'RAN') ?? [];
  const wins = results.filter(e => e.finishingPosition === 1).length;

  const handleDiscussion = () => {
    const communityDomain = Env.EXPO_PUBLIC_COMMUNITY_DOMAIN;
    if (communityDomain && horse.circleSpaceId) {
      router.push({
        pathname: '/(app)/community',
        params: {
          url: `https://${communityDomain}/spaces/${horse.circleSpaceId}`,
        },
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#fcf9f2]">
      <HorseHero horse={horse} />

      {/* Stats Grid */}
      <View className="mb-10 flex-row flex-wrap gap-4 px-6">
        <View className="w-[47%] rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
          <Text className="mb-2 font-mono text-[10px] tracking-widest text-[#7e747c] uppercase">Total Wins</Text>
          <Text className="font-display text-4xl text-primary">{wins}</Text>
        </View>
        <View className="w-[47%] rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
          <Text className="mb-2 font-mono text-[10px] tracking-widest text-[#7e747c] uppercase">Starts</Text>
          <Text className="font-display text-4xl text-primary">{results.length}</Text>
        </View>
      </View>

      {/* Detail Modules */}
      <View className="mb-12 gap-6 px-6">
        {nextEntry && (
          <View className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
            <Text className="mb-4 font-mono text-[10px] tracking-widest text-[#7e747c] uppercase">Next Up</Text>
            <NextEntryCard entry={nextEntry} />
          </View>
        )}

        {results.length > 0 && (
          <View className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
            <Text className="mb-4 font-mono text-[10px] tracking-widest text-[#7e747c] uppercase">Recent Results</Text>
            <View className="overflow-hidden">
              {results.map(entry => (
                <ResultRow key={entry.id} entry={entry} />
              ))}
            </View>
          </View>
        )}

        {horse.trainer && (
          <View className="rounded-2xl bg-[#374b6c] p-6 shadow-md">
            <Text className="mb-2 font-mono text-[10px] tracking-widest text-blue-100 uppercase">Trainer</Text>
            <Text className="font-display text-2xl text-white">{horse.trainer.name}</Text>
          </View>
        )}

        {horse.circleSpaceId && (
          <Pressable
            onPress={handleDiscussion}
            className="mt-4 items-center rounded-full bg-black py-4 duration-200 active:scale-95"
          >
            <Text className="font-mono text-sm tracking-widest text-white uppercase">
              Join the Discussion
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
