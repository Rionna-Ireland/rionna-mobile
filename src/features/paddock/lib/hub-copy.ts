import { formatEuro } from '@/features/paddock/lib/format-euro';
import { translate } from '@/lib/i18n';

/** "N offers" once the count is known and non-zero, else the static line. */
export function offersSubtitle(count: number | null): string {
  if (count === null || count === 0)
    return translate('paddock.hub.benefitsFallback');
  return count === 1 ? translate('paddock.hub.oneOffer') : translate('paddock.hub.manyOffers', { count });
}

/** "€X raised to date." plus the vote clause only when a poll is linked. */
export function charitySubtitle(charity: { totalCents: number; pollId: string | null } | null | undefined): string {
  if (!charity)
    return translate('paddock.hub.charityFallback');
  const raised = translate('paddock.hub.raised', { amount: formatEuro(charity.totalCents) });
  return charity.pollId ? translate('paddock.hub.raisedVote', { raised }) : raised;
}
