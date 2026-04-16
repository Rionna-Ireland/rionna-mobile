import type { Horse } from '@/features/stables/types';
import { Image, Pressable, Text, View } from '@/components/ui';
import { StatusBadge } from '@/features/stables/components/status-badge';

type HorseCardProps = {
  horse: Horse;
  onPress: () => void;
};

export function HorseCard({ horse, onPress }: HorseCardProps) {
  const photoUrl = horse.photos[0]?.url;

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl bg-card shadow-md"
    >
      {photoUrl
        ? (
            <Image
              source={{ uri: `${photoUrl}?width=400&quality=80` }}
              className="aspect-3/2 w-full"
              contentFit="cover"
            />
          )
        : (
            <View className="aspect-3/2 w-full items-center justify-center bg-neutral-100">
              <Text className="text-sm text-neutral-400">No photo</Text>
            </View>
          )}

      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">
            {horse.name}
          </Text>
          <StatusBadge status={horse.status} />
        </View>

        {horse.trainer
          ? (
              <Text className="text-sm text-neutral-500">
                Trainer:
                {' '}
                {horse.trainer.name}
              </Text>
            )
          : null}

        {horse.nextEntryId
          ? (
              <View className="bg-primary-50 mt-1 rounded-lg px-3 py-2">
                <Text className="text-primary-700 text-xs font-medium">
                  Entry upcoming
                </Text>
              </View>
            )
          : null}
      </View>
    </Pressable>
  );
}
