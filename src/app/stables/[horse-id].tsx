import type { HorseStatus } from '@/features/stables/types';

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

import { StatusBadge } from '@/features/stables/components/status-badge';

export default function HorseProfileScreen() {
  const params = useLocalSearchParams<{ 'horse-id': string }>();
  const horseId = params['horse-id'];
  const { data: horse, isLoading, isError } = useHorse(horseId);
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !horse) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-center text-charcoal-500">
          Horse not found.
        </Text>
      </View>
    );
  }

  const nextEntry = horse.entries?.find(
    e => e.status === 'DECLARED' || e.status === 'ENTERED',
  );
  const results = horse.entries?.filter(e => e.status === 'RAN') ?? [];

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
    <ScrollView className="flex-1 bg-background">
      <HeroSection
        photoUrl={horse.photos[0]?.url}
        name={horse.name}
        status={horse.status}
      />

      <View className="gap-6 p-4">
        {horse.bio
          ? (
              <Section title="About">
                <Text className="leading-relaxed text-charcoal-700">
                  {horse.bio}
                </Text>
              </Section>
            )
          : null}

        {horse.trainer
          ? (
              <Section title="Trainer">
                <Text className="text-charcoal-700">{horse.trainer.name}</Text>
              </Section>
            )
          : null}

        {nextEntry
          ? <NextEntryCard entry={nextEntry} />
          : null}

        <Section title="Recent Results">
          {results.length > 0
            ? (
                <View className="overflow-hidden rounded-xl bg-card">
                  {results.map(entry => (
                    <ResultRow key={entry.id} entry={entry} />
                  ))}
                </View>
              )
            : (
                <Text className="text-sm text-neutral-500">No results yet</Text>
              )}
        </Section>

        {horse.circleSpaceId
          ? (
              <Pressable
                onPress={handleDiscussion}
                className="bg-primary-500 items-center rounded-xl px-4 py-3"
              >
                <Text className="font-semibold text-white">
                  Join the Discussion
                </Text>
              </Pressable>
            )
          : null}
      </View>
    </ScrollView>
  );
}

function HeroSection({
  photoUrl,
  name,
  status,
}: {
  photoUrl: string | undefined;
  name: string;
  status: HorseStatus;
}) {
  if (photoUrl) {
    return (
      <View className="relative">
        <Image
          source={{ uri: `${photoUrl}?width=800&quality=80` }}
          className="aspect-video w-full"
          contentFit="cover"
        />
        <View className="absolute inset-x-0 bottom-0 bg-black/40 px-4 pt-8 pb-4">
          <Text className="font-display text-2xl font-bold text-white">
            {name}
          </Text>
          <View className="mt-1">
            <StatusBadge status={status} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-neutral-100 px-4 py-8">
      <Text className="font-display text-2xl font-bold text-charcoal-900">
        {name}
      </Text>
      <View className="mt-2">
        <StatusBadge status={status} />
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        {title}
      </Text>
      {children}
    </View>
  );
}
