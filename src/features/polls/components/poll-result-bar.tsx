import { Text, View } from '@/components/ui';

type PollResultBarProps = {
  label: string;
  percent: number;
  mine: boolean;
  optionId: string;
};

export function PollResultBar({ label, percent, mine, optionId }: PollResultBarProps) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className={`font-sans text-sm ${mine ? 'font-semibold text-ink' : 'text-neutral-700'}`}>{label}</Text>
          {mine ? <Text testID={`poll-my-choice-${optionId}`} className="font-sans text-sm text-violet-700">✓</Text> : null}
        </View>
        <Text className="font-mono text-xs text-neutral-600">{`${percent}%`}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-surface-container">
        <View
          testID={`poll-bar-${optionId}`}
          className={`h-2 rounded-full ${mine ? 'bg-primary' : 'bg-outline-variant'}`}
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}
