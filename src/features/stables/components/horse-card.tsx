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
      className="overflow-hidden rounded-2xl bg-card"
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
            <View className="aspect-3/2 w-full items-center justify-center bg-muted">
              <Text className="text-sm text-muted-foreground">No photo</Text>
            </View>
          )}

      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-2xl text-foreground">
            {horse.name}
          </Text>
          <StatusBadge status={horse.status} />
        </View>

        {horse.trainer
          ? (
              <Text className="text-sm text-muted-foreground">
                Trainer:
                {' '}
                {horse.trainer.name}
              </Text>
            )
          : null}

        {horse.nextEntryId
          ? (
              <View className="mt-1 rounded-lg bg-muted px-3 py-2">
                <Text className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
                  Entry upcoming
                </Text>
              </View>
            )
          : null}
      </View>
    </Pressable>
  );
}
