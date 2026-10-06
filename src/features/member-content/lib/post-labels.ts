import type { AuthorRole, MemberFeedItem } from '@/features/member-content/types';

import { a11ySummary } from '@/components/ui/a11y-card';
import { formatRelativeTime } from '@/features/member-content/lib/space-tag';
import { translate } from '@/lib/i18n';

const ROLE_KEY = { trainer: 'community.role.trainer', staff: 'community.role.staff' } as const;

/** Display name for a post or comment author; a blank name reads as "Rionna member". */
export function authorDisplayName(name: string | null | undefined): string {
  return name?.trim() || translate('community.post.anonymousAuthor');
}

/** "1 like" / "24 likes". */
export function likeCountLabel(count: number): string {
  return translate(count === 1 ? 'community.like.countOne' : 'community.like.countOther', { count });
}

/** "1 comment" / "12 comments". */
export function commentCountLabel(count: number): string {
  return translate(count === 1 ? 'community.post.commentCountOne' : 'community.post.commentCountOther', { count });
}

/** Role badge text ("Trainer" / "Staff"). */
export function roleLabel(role: AuthorRole): string {
  return translate(ROLE_KEY[role]);
}

/**
 * Everything VoiceOver needs from the card in one label (S14-08 A-004):
 * "Jane Trainer, Stable Updates, 2h ago, Morning from the yard, The horses…, 9 likes, 4 comments".
 */
export function feedCardSummary(item: MemberFeedItem): string {
  return a11ySummary([
    authorDisplayName(item.authorName),
    item.spaceName,
    formatRelativeTime(item.createdAt),
    item.title,
    item.excerpt,
    item.isLiked ? translate('community.like.liked') : null,
    likeCountLabel(item.likeCount),
    commentCountLabel(item.commentCount),
  ]);
}
