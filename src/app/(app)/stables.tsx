import type { Horse } from '@/features/stables/types';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { RefreshControl } from 'react-native';
import { ActivityIndicator, Text, View } from '@/components/ui';
import { List } from '@/components/ui/list';
import { useHorses } from '@/features/stables/api/use-horses';
import { HorseCard } from '@/features/stables/components/horse-card';

export default function StablesScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useHorses();
  const router = useRouter();

  const handlePress = React.useCallback(
    (horseId: string) => {
      router.push(`/stables/${horseId}`);
    },
    [router],
  );

  const renderItem = React.useCallback(
    ({ item }: { item: Horse }) => (
      <HorseCard horse={item} onPress={() => handlePress(item.id)} />
    ),
    [handlePress],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-center text-charcoal-500">
          Something went wrong loading the stables.
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-lg font-semibold text-charcoal-700">
          No horses yet
        </Text>
        <Text className="mt-1 text-center text-charcoal-500">
          Horses will appear here once they're added.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <List
        data={data}
        renderItem={renderItem}
        keyExtractor={(item: Horse) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
    </View>
  );
}
