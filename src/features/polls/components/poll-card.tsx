import type { Poll } from '@/features/polls/types';

import { Pressable, Text, View } from '@/components/ui';
import { PollResultBar } from '@/features/polls/components/poll-result-bar';

type PollCardProps = {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  pending: boolean;
  variant: 'card' | 'tile';
};

function percentFor(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function formatVotes(total: number) {
  return `${total} ${total === 1 ? 'vote' : 'votes'}`;
}

export function PollCard({ poll, onVote, pending, variant }: PollCardProps) {
  const closed = poll.status === 'closed';
  const showResults = poll.results !== null;
  const canVote = !closed && !pending;
  const eyebrowText = closed ? 'Closed' : poll.scope === 'space' ? 'Stable vote' : 'Club vote';
  const showEyebrow = variant === 'card' || closed;

  return (
    <View
      testID={`poll-card-${poll.id}`}
      className={variant === 'card' ? 'gap-4 rounded-2xl border border-neutral-300 bg-white p-5' : 'gap-4 px-6 py-4'}
    >
      <View className="gap-1">
        {showEyebrow
          ? <Text className="font-mono text-[10px] tracking-widest text-violet-700 uppercase">{eyebrowText}</Text>
          : null}
        <Text className="font-sans text-lg font-semibold text-ink">{poll.question}</Text>
      </View>

      <View className="gap-3">
        {poll.options.map((option) => {
          const mine = poll.myVoteOptionId === option.id;
          if (showResults && poll.results) {
            return (
              <Pressable
                key={option.id}
                testID={`poll-option-${option.id}`}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: mine, disabled: !canVote }}
                disabled={!canVote}
                onPress={() => onVote(poll.id, option.id)}
              >
                <PollResultBar
                  label={option.label}
                  percent={percentFor(poll.results.byOption[option.id] ?? 0, poll.results.total)}
                  mine={mine}
                  optionId={option.id}
                />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={option.id}
              testID={`poll-option-${option.id}`}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: mine, disabled: !canVote }}
              disabled={!canVote}
              onPress={() => onVote(poll.id, option.id)}
              className={`rounded-full border px-4 py-3 ${
                mine ? 'border-primary bg-primary' : 'border-neutral-300 bg-white'
              }`}
            >
              <Text className={`font-sans text-sm ${mine ? 'font-semibold text-on-primary' : 'text-neutral-700'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="font-sans text-xs text-neutral-600">
        {pending
          ? 'Saving your vote…'
          : showResults && poll.results
            ? formatVotes(poll.results.total)
            : 'Tap an option to vote. You can change your mind while the vote is open.'}
      </Text>
    </View>
  );
}
