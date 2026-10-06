import type { SharedValue } from 'react-native-reanimated';
import type { TileSpec } from '@/components/brand/pattern';
import type { Charity } from '@/features/paddock/types';

import * as React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { PatternWave } from '@/components/brand/pattern';
import { Card, colors, MonoLabel, ProgressBar, Text, View } from '@/components/ui';
import { StarV2 } from '@/components/ui/icons/v2';
import { CharityTotalText } from '@/features/paddock/components/charity-total-text';
import { formatEuro } from '@/features/paddock/lib/format-euro';
import { useCharityCounter } from '@/features/paddock/lib/use-charity-counter';
import { translate } from '@/lib/i18n';

/** The forest card's green harlequin with its spurs lit cream (S14-06 wave). */
const GREEN_LIT: TileSpec = { kind: 'harlequin', colourway: 'greenLit', turn: 0 };

/** The thumb turns this far over the goal draw and settles (an eight-point star looks the same at rest). */
const THUMB_TURN_DEG = 45;

export function goalLine(charity: Pick<Charity, 'goalCents' | 'goalProgress'>): string | null {
  if (charity.goalCents === null || charity.goalProgress === null)
    return null;
  return `${Math.round(charity.goalProgress * 100)}% of this year’s ${formatEuro(charity.goalCents)} goal`;
}

/** Eight-point star riding the bar's leading edge, turning 45° as the bar draws. */
function StarThumb({ draw }: { draw: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${THUMB_TURN_DEG * draw.get()}deg` }] }));
  return (
    <Animated.View style={style}>
      <StarV2 size={21} color={colors.secondaryContainer} />
    </Animated.View>
  );
}

/**
 * Forest hero card (frame 15): total, goal bar with star thumb, goal line.
 * S14-06: on mount (once per session) the total counts up from the member's
 * last-seen total, the goal bar draws alongside it with the star riding the
 * edge, and an increase lights the pattern in a wave.
 */
export function CharityTotalCard({ charity }: { charity: Charity }) {
  const goal = goalLine(charity);
  const percent = charity.goalProgress === null ? 0 : Math.min(100, Math.max(0, Math.round(charity.goalProgress * 100)));
  const counter = useCharityCounter('charity', charity.totalCents);
  const { start } = counter;

  React.useEffect(() => {
    start();
  }, [start]);

  return (
    <Card
      variant="forest"
      testID="charity-total-card"
      className="gap-8"
      patternOverlay={counter.waveArmed ? <PatternWave spec={GREEN_LIT} clock={counter.wave} borderRadius={8} testID="charity-total-wave" /> : null}
    >
      <View className="gap-2">
        <MonoLabel tone="white">{translate('paddock.charity.totalKicker')}</MonoLabel>
        <CharityTotalText
          counter={counter}
          totalCents={charity.totalCents}
          color={colors.secondaryContainer}
          className="text-secondary-container"
          testID="charity-total-amount"
        />
      </View>
      {goal
        ? (
            <View className="gap-2">
              <ProgressBar
                testID="charity-goal-bar"
                tone="on-dark"
                value={percent}
                drawProgress={counter.draw}
                accessibilityLabel={goal}
                renderThumb={() => <StarThumb draw={counter.draw} />}
              />
              <Text variant="body-sm" className="text-white">{goal}</Text>
            </View>
          )
        : null}
    </Card>
  );
}
