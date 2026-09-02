import type { MemberFeedItem } from '@/features/member-content/types';

import { MemberFeedCard } from '@/features/member-content/components/member-feed-card';
import { PollCard } from '@/features/polls/components/poll-card';

type FeedItemRendererProps = {
  item: MemberFeedItem;
  onOpen: (spaceId: string, postId: string) => void;
  onToggleLike?: (postId: string, liked: boolean) => void;
  likePending?: boolean;
  onVote: (pollId: string, optionId: string) => void;
  votePending: boolean;
};

export function FeedItemRenderer({
  item,
  onOpen,
  onToggleLike,
  likePending,
  onVote,
  votePending,
}: FeedItemRendererProps) {
  if (item.kind === 'poll' && item.poll) {
    return <PollCard poll={item.poll} onVote={onVote} pending={votePending} variant="card" />;
  }

  return (
    <MemberFeedCard
      item={item}
      onOpen={onOpen}
      onToggleLike={onToggleLike}
      likePending={likePending}
    />
  );
}
