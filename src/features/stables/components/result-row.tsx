import type { Entry } from '@/features/stables/types';
import { Text, View } from '@/components/ui';

type ResultRowProps = {
  entry: Entry;
};

function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = n % 100;
  const suffix
    = suffixes[(remainder - 20) % 10] ?? suffixes[remainder] ?? suffixes[0];
  return `${n}${suffix}`;
}

function getPositionColor(position: number | null): string {
  switch (position) {
    case 1:
      return 'text-yellow-600';
    case 2:
      return 'text-neutral-400';
    case 3:
      return 'text-amber-700';
    default:
      return 'text-neutral-600';
  }
}

function getPositionBg(position: number | null): string {
  switch (position) {
    case 1:
      return 'bg-yellow-50';
    case 2:
      return 'bg-neutral-50';
    case 3:
      return 'bg-amber-50';
    default:
      return 'bg-neutral-50';
  }
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

export function ResultRow({ entry }: ResultRowProps) {
  const { race } = entry;
  const position = entry.finishingPosition;
  const courseName = race.meeting.course.name;
  const date = formatShortDate(race.meeting.date);

  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View
        className={`size-10 items-center justify-center rounded-full ${getPositionBg(position)}`}
      >
        {position != null
          ? (
              <Text
                className={`text-sm font-bold ${getPositionColor(position)}`}
              >
                {getOrdinal(position)}
              </Text>
            )
          : (
              <Text className="text-sm font-bold text-neutral-400">--</Text>
            )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-charcoal-800">
            {courseName}
          </Text>
          <Text className="text-xs text-neutral-500">{date}</Text>
        </View>

        {entry.timeformComment
          ? (
              <Text
                className="mt-0.5 text-xs text-neutral-500"
                numberOfLines={1}
              >
                {entry.timeformComment}
              </Text>
            )
          : null}
      </View>
    </View>
  );
}
