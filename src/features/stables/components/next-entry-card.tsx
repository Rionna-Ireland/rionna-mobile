import type { Entry } from '@/features/stables/types';
import { Text, View } from '@/components/ui';

type NextEntryCardProps = {
  entry: Entry;
};

function formatPostTime(postTime: string): string {
  const date = new Date(postTime);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function NextEntryCard({ entry }: NextEntryCardProps) {
  const { race } = entry;
  const courseName = race.meeting.course.name;
  const meetingDate = formatDate(race.meeting.date);
  const postTime = formatPostTime(race.postTime);

  return (
    <View className="border-l-primary-500 bg-primary-50 overflow-hidden rounded-2xl border-l-4 p-4">
      <Text className="text-primary-500 mb-1 text-xs font-semibold tracking-wide uppercase">
        Next Entry
      </Text>

      {race.name
        ? (
            <Text className="mb-2 font-display text-lg font-bold text-charcoal-900">
              {race.name}
            </Text>
          )
        : null}

      <View className="mb-3 flex-row items-center gap-2">
        <Text className="text-sm font-semibold text-charcoal-800">
          {courseName}
        </Text>
        <Text className="text-sm text-neutral-500">
          {meetingDate}
          {' '}
          at
          {postTime}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {entry.draw != null
          ? (
              <DetailItem label="Draw" value={String(entry.draw)} />
            )
          : null}

        {entry.weightLbs != null
          ? (
              <DetailItem label="Weight" value={`${entry.weightLbs} lbs`} />
            )
          : null}

        {entry.jockey
          ? (
              <DetailItem label="Jockey" value={entry.jockey.name} />
            )
          : null}

        {race.goingDescription
          ? (
              <DetailItem label="Going" value={race.goingDescription} />
            )
          : null}
      </View>
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs text-neutral-500">{label}</Text>
      <Text className="text-sm font-medium text-charcoal-800">{value}</Text>
    </View>
  );
}
