import type { TileSpec } from '@/components/brand/pattern';
import type { Poll } from '@/features/polls/types';

import * as React from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { PatternWave } from '@/components/brand/pattern';
import { Card, CheckSquare, colors, MonoLabel, Pressable, Text, View, withAlpha } from '@/components/ui';
import { PollResultBar } from '@/features/polls/components/poll-result-bar';
import { castVote } from '@/features/polls/lib/cast-vote';
import { percentagesFor } from '@/features/polls/lib/percentages';
import { translate } from '@/lib/i18n';
import { playWave, staggerDelay, useMotion, WAVE_BARS_DELAY } from '@/lib/motion';

const VOTE_PATTERN: TileSpec = { kind: 'harlequin', colourway: 'green', turn: 0 };
/** The same tile with its spurs lit: the vote replays the charity wave (S14-06 §4). */
const VOTE_PATTERN_LIT: TileSpec = { kind: 'harlequin', colourway: 'greenLit', turn: 0 };
/** Unchecked square: forest @ 15%. */
const FOREST_TRACK = withAlpha(colors.forest, 0.15);

type Props = {
  poll: Poll;
  pending: boolean;
  onVote: (pollId: string, optionId: string) => void;
};

function formatVotes(total: number) {
  return total === 1 ? translate('paddock.vote.one') : translate('paddock.vote.many', { count: total });
}

/**
 * Charity-screen member vote (frame 15): the poll inline on a sage pattern
 * card. Pre-vote: two-column grid of white checkbox rows. Post-vote: results
 * bars (reusing the polls feature's bar + percentage maths).
 *
 * S14-06 vote replay: casting (or changing) the vote gives `castVote`'s
 * success haptic, replays the pattern wave on this card, then draws the
 * results bars in (`base`, staggered). Reduce Motion: the haptic only.
 */
export function CharityVoteCard({ poll, pending, onVote }: Props) {
  const canVote = poll.status !== 'closed' && !pending;
  const results = poll.results;
  const percents = results ? percentagesFor(poll.options, results) : null;
  const { reduceMotion } = useMotion();
  const wave = useSharedValue(0);
  const [replay, setReplay] = React.useState(0);

  const pick = (optionId: string) => {
    if (castVote(poll, optionId, onVote) && !reduceMotion) {
      playWave(wave);
      setReplay(n => n + 1);
    }
  };

  return (
    <Card
      variant="sage"
      pattern={VOTE_PATTERN}
      patternOverlay={replay > 0 ? <PatternWave spec={VOTE_PATTERN_LIT} clock={wave} borderRadius={8} testID="charity-vote-wave" /> : null}
      testID={`poll-card-${poll.id}`}
      className="gap-6"
    >
      <MonoLabel className="text-forest">{translate('paddock.vote.kicker')}</MonoLabel>
      <Text variant="display-md" className="text-forest">{poll.question}</Text>

      {results
        ? (
            <View className="gap-2">
              {poll.options.map((option, index) => (
                <Pressable
                  key={option.id}
                  testID={`poll-option-${option.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: poll.myVoteOptionId === option.id, disabled: !canVote }}
                  disabled={!canVote}
                  onPress={() => pick(option.id)}
                  className="rounded-md bg-white px-4 py-3"
                >
                  <PollResultBar
                    label={option.label}
                    percent={percents?.[option.id] ?? 0}
                    mine={poll.myVoteOptionId === option.id}
                    optionId={option.id}
                    drawKey={replay}
                    drawDelay={WAVE_BARS_DELAY + staggerDelay(index)}
                  />
                </Pressable>
              ))}
            </View>
          )
        : (
            <View className="flex-row flex-wrap gap-1">
              {poll.options.map((option) => {
                const mine = poll.myVoteOptionId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    testID={`poll-option-${option.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: mine, disabled: !canVote }}
                    disabled={!canVote}
                    onPress={() => pick(option.id)}
                    className="min-w-[48%] flex-1 flex-row items-center gap-3 rounded-md bg-white py-2 pr-4 pl-2"
                  >
                    <CheckSquare checked={mine} size={15} fill={colors.forest} track={FOREST_TRACK} />
                    <Text variant="body-sm" className="flex-1 font-sans-semibold" numberOfLines={2}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

      <Text variant="body-sm" className="text-forest">
        {pending
          ? translate('paddock.vote.saving')
          : results
            ? formatVotes(results.total)
            : translate('paddock.vote.hint')}
      </Text>
    </Card>
  );
}
