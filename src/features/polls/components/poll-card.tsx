import type { Poll } from '@/features/polls/types';

import { Card, CheckSquare, MonoLabel, MotionPressable, Text, View } from '@/components/ui';
import { PollResultBar } from '@/features/polls/components/poll-result-bar';
import { castVote } from '@/features/polls/lib/cast-vote';
import { percentagesFor } from '@/features/polls/lib/percentages';
import { translate } from '@/lib/i18n';

type PollCardProps = {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  pending: boolean;
  variant: 'card' | 'tile';
};

function formatVotes(total: number) {
  return translate(total === 1 ? 'polls.votesOne' : 'polls.votesOther', { count: total });
}

function eyebrow(poll: Poll) {
  if (poll.status === 'closed')
    return translate('polls.closed');
  return translate(poll.scope === 'space' ? 'polls.stableVote' : 'polls.clubVote');
}

export function PollCard({ poll, onVote, pending, variant }: PollCardProps) {
  const closed = poll.status === 'closed';
  const showResults = poll.results !== null;
  const canVote = !closed && !pending;
  const eyebrowText = eyebrow(poll);
  const showEyebrow = variant === 'card' || closed;
  const percents = showResults && poll.results ? percentagesFor(poll.options, poll.results) : null;

  return (
    <Card
      testID={`poll-card-${poll.id}`}
      noPadding={variant !== 'card'}
      className={variant === 'card' ? 'gap-4 border border-outline-variant' : 'gap-4 px-6 py-4'}
    >
      <View className="gap-2">
        {showEyebrow ? <MonoLabel>{eyebrowText}</MonoLabel> : null}
        <Text variant="display-sm">{poll.question}</Text>
      </View>

      <View className="gap-3">
        {poll.options.map((option) => {
          const mine = poll.myVoteOptionId === option.id;
          if (showResults && poll.results) {
            return (
              <MotionPressable
                key={option.id}
                testID={`poll-option-${option.id}`}
                size="flat"
                pressedOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityValue={{ text: `${percents?.[option.id] ?? 0}%` }}
                accessibilityState={{ selected: mine, disabled: !canVote }}
                disabled={!canVote}
                onPress={() => castVote(poll, option.id, onVote)}
              >
                <PollResultBar
                  label={option.label}
                  percent={percents?.[option.id] ?? 0}
                  mine={mine}
                  optionId={option.id}
                />
              </MotionPressable>
            );
          }
          return (
            <MotionPressable
              key={option.id}
              testID={`poll-option-${option.id}`}
              size="flat"
              pressedOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: mine, disabled: !canVote }}
              disabled={!canVote}
              onPress={() => castVote(poll, option.id, onVote)}
              className="flex-row items-center gap-3 overflow-hidden rounded-lg border border-outline-variant bg-white p-3"
            >
              <CheckSquare checked={mine} testID={`poll-option-${option.id}-check`} />
              <Text variant="body" className={mine ? 'font-sans-semibold' : ''}>{option.label}</Text>
            </MotionPressable>
          );
        })}
      </View>

      <Text variant="body-sm" className="text-ink-variant">
        {pending
          ? translate('polls.saving')
          : showResults && poll.results
            ? formatVotes(poll.results.total)
            : translate('polls.hint')}
      </Text>
    </Card>
  );
}
