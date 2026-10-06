import { translate } from '@/lib/i18n';

export type InboxTag = 'racing' | 'updates' | 'community' | 'club';

export type InboxTagSpec = {
  tag: InboxTag;
  label: string;
  /** Tailwind background class for the tag box. */
  boxClass: string;
};

const RACING_KINDS = new Set(['race_declared', 'race_non_runner', 'race_result']);
const UPDATE_KINDS = new Set(['horse_update', 'horse_posts']);
const COMMUNITY_KINDS = new Set(['post_like', 'post_comment', 'post_removed']);

/** Inbox `kind` (S12-06 kinds.ts) to its category tag. Unknown kinds read as CLUB. */
export function tagForKind(kind: string): InboxTag {
  if (RACING_KINDS.has(kind))
    return 'racing';
  if (UPDATE_KINDS.has(kind))
    return 'updates';
  if (COMMUNITY_KINDS.has(kind))
    return 'community';
  return 'club';
}

const SPECS = {
  racing: { tag: 'racing', labelKey: 'notificationCentre.tags.racing', boxClass: 'bg-sage' },
  updates: { tag: 'updates', labelKey: 'notificationCentre.tags.updates', boxClass: 'bg-ice' },
  community: { tag: 'community', labelKey: 'notificationCentre.tags.community', boxClass: 'bg-primary-fixed' },
  club: { tag: 'club', labelKey: 'notificationCentre.tags.club', boxClass: 'bg-secondary-container' },
} as const satisfies Record<InboxTag, { tag: InboxTag; labelKey: string; boxClass: string }>;

export function tagSpecForKind(kind: string): InboxTagSpec {
  const { labelKey, ...spec } = SPECS[tagForKind(kind)];
  return { ...spec, label: translate(labelKey) };
}
