import type { InboxItem, InboxSectionKey } from '@/features/notification-centre/types';
import { translate } from '@/lib/i18n';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TITLE_KEYS = {
  today: 'notificationCentre.sections.today',
  week: 'notificationCentre.sections.week',
  earlier: 'notificationCentre.sections.earlier',
} as const satisfies Record<InboxSectionKey, string>;
const ORDER: InboxSectionKey[] = ['today', 'week', 'earlier'];

function sectionFor(updatedAt: string, now: Date): InboxSectionKey {
  const date = new Date(updatedAt);
  if (date.toDateString() === now.toDateString())
    return 'today';
  return now.getTime() - date.getTime() < WEEK_MS ? 'week' : 'earlier';
}

export function groupInboxSections(items: InboxItem[], now: Date) {
  const buckets: Record<InboxSectionKey, InboxItem[]> = { today: [], week: [], earlier: [] };
  for (const item of items)
    buckets[sectionFor(item.updatedAt, now)].push(item);
  return ORDER.filter(key => buckets[key].length > 0).map(key => ({ key, title: translate(TITLE_KEYS[key]), data: buckets[key] }));
}
