import type { MemberFeedItem } from '@/features/member-content/types';

import * as React from 'react';

import { Card, Image, Text } from '@/components/ui';
import { a11yCardProps } from '@/components/ui/a11y-card';
import { ActivityRow, AuthorHeader } from '@/features/member-content/components/post-parts';
import { feedCardSummary } from '@/features/member-content/lib/post-labels';
import { formatRelativeTime } from '@/features/member-content/lib/space-tag';
import { translate } from '@/lib/i18n';

type MemberFeedCardProps = {
  item: MemberFeedItem;
  onOpen: (spaceId: string, postId: string) => void;
  /** Wire to flip the like; omitted → read-only count (e.g. legacy surfaces). */
  onToggleLike?: (postId: string, liked: boolean) => void;
  /** Disables the heart while this post's like mutation is in flight. */
  likePending?: boolean;
};

type CardContentProps = Pick<MemberFeedCardProps, 'item' | 'onToggleLike' | 'likePending'>;

function CardContent({ item, onToggleLike, likePending }: CardContentProps) {
  return (
    <>
      <AuthorHeader
        name={item.authorName}
        avatarUrl={item.authorAvatarUrl}
        time={formatRelativeTime(item.createdAt)}
        spaceName={item.spaceName}
        spaceId={item.spaceId}
        role={item.authorRole}
      />
      {item.title ? <Text variant="title">{item.title}</Text> : null}
      {item.excerpt
        ? <Text variant="body-lg" className="text-ink-variant" numberOfLines={3}>{item.excerpt}</Text>
        : null}
      {item.imageUrl
        ? (
            <Image
              source={{ uri: item.imageUrl }}
              className="aspect-video w-full rounded-md bg-secondary-container"
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={item.title}
            />
          )
        : null}
      <ActivityRow
        likeCount={item.likeCount}
        commentCount={item.commentCount}
        isLiked={item.isLiked}
        likePending={likePending}
        onToggleLike={onToggleLike ? () => onToggleLike(item.id, !item.isLiked) : undefined}
      />
    </>
  );
}

const CARD_CLASS = 'gap-3 border border-outline-variant';

/**
 * Feed post card. With a space it's one tappable element (S14 press scale)
 * that opens the thread; to a screen reader it's one summary with Like as a
 * custom action, since the nested heart can't be reached inside it (A-004).
 */
export function MemberFeedCard({ item, onOpen, onToggleLike, likePending }: MemberFeedCardProps) {
  const content = <CardContent item={item} onToggleLike={onToggleLike} likePending={likePending} />;
  if (!item.spaceId) {
    return <Card className={CARD_CLASS}>{content}</Card>;
  }
  const spaceId = item.spaceId;
  const likeAction = onToggleLike && !likePending
    ? {
        name: 'like',
        label: translate(item.isLiked ? 'community.like.unlikeAction' : 'community.like.likeAction'),
        onAction: () => onToggleLike(item.id, !item.isLiked),
      }
    : null;
  return (
    <Card
      className={CARD_CLASS}
      onPress={() => onOpen(spaceId, item.id)}
      accessibilityHint={translate('community.post.openHint')}
      {...a11yCardProps({ label: feedCardSummary(item), actions: [likeAction] })}
    >
      {content}
    </Card>
  );
}
