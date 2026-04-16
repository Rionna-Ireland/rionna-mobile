import type { LatestResult } from '@/features/pulse/types';

import { useRouter } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui';
import { TileWrapper } from '@/features/pulse/components/tile-wrapper';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function positionColor(pos: number | null): string {
  if (pos === 1)
    return '#FFD700';
  if (pos === 2)
    return '#C0C0C0';
  if (pos === 3)
    return '#CD7F32';
  return '#9CA3AF';
}

function PositionBadge({ position }: { position: number | null }) {
  return (
    <View
      className="size-8 items-center justify-center rounded-full"
      style={{ backgroundColor: positionColor(position) }}
    >
      <Text className="text-xs font-bold text-white">
        {position
          ? ordinal(position)
          : '—'}
      </Text>
    </View>
  );
}

function ResultRow({ result }: { result: LatestResult }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/stables/${result.horse.id}`)}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      <PositionBadge position={result.finishingPosition} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">
          {result.horse.name}
        </Text>
        <Text className="text-xs text-neutral-500">
          {result.race.meeting.course.name}
        </Text>
      </View>
    </Pressable>
  );
}

type LatestResultsTileProps = {
  data: LatestResult[] | undefined;
  isLoading: boolean;
};

export function LatestResultsTile({ data, isLoading }: LatestResultsTileProps) {
  const hasResults = data && data.length > 0;

  return (
    <TileWrapper title="Latest Results" isLoading={isLoading}>
      {hasResults
        ? (
            <View className="pb-2">
              {data.map(result => (
                <ResultRow key={result.id} result={result} />
              ))}
            </View>
          )
        : (
            <View className="px-4 pb-4">
              <Text className="text-sm text-neutral-400">No results yet</Text>
            </View>
          )}
    </TileWrapper>
  );
}
