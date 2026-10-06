import * as React from 'react';
import { useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ProgressBar, Text, View } from '@/components/ui';
import { timings } from '@/lib/motion';

type PollResultBarProps = {
  label: string;
  percent: number;
  mine: boolean;
  optionId: string;
  /**
   * S14-06 vote replay: each new key redraws the bar from empty after
   * `drawDelay` ms over `base`. Omit to keep the bar's own value animation.
   */
  drawKey?: number;
  drawDelay?: number;
};

export function PollResultBar({ label, percent, mine, optionId, drawKey, drawDelay = 0 }: PollResultBarProps) {
  // Start empty if the bar mounts mid-replay, so it never flashes full first.
  const draw = useSharedValue(drawKey ? 0 : 1);

  React.useEffect(() => {
    if (!drawKey)
      return;
    draw.set(0);
    draw.set(withDelay(drawDelay, withTiming(1, timings.enter)));
  }, [drawKey, drawDelay, draw]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Text variant="body" className={mine ? 'font-sans-semibold' : 'text-ink-variant'}>{label}</Text>
          {mine ? <Text testID={`poll-my-choice-${optionId}`} variant="body" className="text-primary">✓</Text> : null}
        </View>
        <Text variant="label">{`${percent}%`}</Text>
      </View>
      <ProgressBar
        testID={`poll-bar-${optionId}`}
        value={percent}
        tone="light"
        height={8}
        drawProgress={drawKey === undefined ? undefined : draw}
      />
    </View>
  );
}
