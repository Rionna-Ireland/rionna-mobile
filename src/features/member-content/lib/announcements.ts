import type { FeedChip, MemberFeedItem } from '@/features/member-content/types';

export const MAX_ANNOUNCEMENTS = 5;

const ANNOUNCEMENT_SPACE_NAME = /\bannouncements?\b/i;

/**
 * Space ids that look like the Official Announcements space, taken from the
 * space chips (the mobile app never sees `circle.communitySpaceId` directly).
 */
export function announcementSpaceIdsFromChips(chips: FeedChip[]): string[] {
  return chips
    .filter(chip => chip.kind === 'space' && ANNOUNCEMENT_SPACE_NAME.test(chip.label))
    .flatMap(chip => chip.spaceIds);
}

/**
 * The backend's `isAnnouncement` wins when present (boolean). Only when the
 * field is undefined (older payloads / cached feeds) do we fall back to the
 * heuristic: a known announcements space, or a space name reading "Announcements".
 */
function isAnnouncementItem(item: MemberFeedItem, ids: Set<string>): boolean {
  if (typeof item.isAnnouncement === 'boolean')
    return item.isAnnouncement;
  return (item.spaceId !== null && ids.has(item.spaceId))
    || (item.spaceName !== null && ANNOUNCEMENT_SPACE_NAME.test(item.spaceName));
}

/**
 * Picks the posts shown in the Community announcement carousel (S13-06).
 * Only openable posts qualify; newest first.
 */
export function selectAnnouncements(
  items: MemberFeedItem[] | undefined,
  announcementSpaceIds: string[] = [],
  limit = MAX_ANNOUNCEMENTS,
): MemberFeedItem[] {
  if (!items) {
    return [];
  }
  const ids = new Set(announcementSpaceIds);
  return [...items]
    .filter(item => item.kind === 'post' && item.spaceId !== null)
    .filter(item => isAnnouncementItem(item, ids))
    .sort((a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0))
    .slice(0, limit);
}
