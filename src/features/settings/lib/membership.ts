import type { Membership, MembershipStatus } from '@/features/settings/api/use-membership';

import { translate } from '@/lib/i18n';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "March 2026"; `null` for a missing/invalid date. */
export function formatMonthYear(iso: string | null | undefined): string | null {
  if (!iso)
    return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()))
    return null;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Founding member, since March 2026" / "Member since March 2026"; `null` without a start date. */
export function getMembershipLine(membership: Pick<Membership, 'since' | 'foundingMember'> | undefined): string | null {
  const since = formatMonthYear(membership?.since);
  if (!since)
    return null;
  return translate(membership?.foundingMember ? 'settings.profile.foundingSince' : 'settings.profile.memberSince', { since });
}

export type StatusPill = { label: string; variant: 'navy' | 'ice' | 'ice-outline' };

/** The status pill for a membership status. */
export function getStatusPill(status: MembershipStatus): StatusPill {
  switch (status) {
    case 'active': return { label: translate('settings.profile.statusActive'), variant: 'navy' };
    case 'past_due': return { label: translate('settings.profile.statusPastDue'), variant: 'ice-outline' };
    case 'cancelled': return { label: translate('settings.profile.statusCancelled'), variant: 'ice' };
    default: return { label: translate('settings.profile.statusNone'), variant: 'ice' };
  }
}
