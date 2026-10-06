import { translate } from '@/lib/i18n';

// Three-letter months ("Sep", not ICU's newer en-IE "Sept"), day first.
const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short' });

function shortDate(date: Date, withYear: boolean): string {
  const base = `${date.getDate()} ${MONTH_SHORT.format(date)}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

export function relativeTime(dateString: string, now: Date = new Date()): string {
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1)
    return translate('common.time.justNow');
  if (diffMinutes < 60)
    return translate('common.time.minutesAgo', { count: diffMinutes });
  if (diffHours < 24)
    return diffHours === 1 ? translate('common.time.hourAgo') : translate('common.time.hoursAgo', { count: diffHours });
  if (diffDays === 1)
    return translate('common.time.yesterday');
  if (diffDays < 7)
    return translate('common.time.daysAgo', { count: diffDays });
  // "20 Sep", like the feed cards; the year only when it isn't this year (A-028).
  return shortDate(date, date.getFullYear() !== now.getFullYear());
}
