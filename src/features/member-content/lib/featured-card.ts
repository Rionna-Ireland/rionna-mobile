import type { FeaturedCardData } from '@/features/member-content/components/featured-card';
import type { FeaturedQa } from '@/features/member-content/types';

import { translate } from '@/lib/i18n';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "8pm", "8:30pm" (device local time; fixed English names, no Intl, like the other date helpers). */
function formatClock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

/** "Thursday 8pm"; `null` for an unparseable date. */
export function formatFeaturedWhen(startsAt: string): string | null {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime()))
    return null;
  return `${WEEKDAYS[d.getDay()]} ${formatClock(d)}`;
}

/** Maps the backend's featured Q&A to the card's data ("Live Q&A · Thursday 8pm"). */
export function toFeaturedCardData(featured: FeaturedQa | null | undefined): FeaturedCardData | null {
  if (!featured || featured.kind !== 'qa')
    return null;
  const when = formatFeaturedWhen(featured.startsAt);
  return {
    id: featured.eventId,
    kicker: when
      ? translate('community.featured.kicker', { when })
      : translate('community.featured.kickerNoDate'),
    title: featured.title,
    subtitle: featured.cta || undefined,
  };
}
