import type { NewsItem } from '@/features/pulse/api/use-latest-news';
import type { LatestResult, NextRunEntry } from '@/features/pulse/types';

export type HeadlineInput = {
  nextRun: NextRunEntry | null | undefined;
  latestResult: LatestResult | null | undefined;
  latestNews: NewsItem | null | undefined;
};

export type Headline = {
  kind: 'declaration' | 'result' | 'news' | 'welcome';
  eyebrow: string;
  title: string;
  subtitle: string | null;
  cta: { label: string; href: string } | null;
};

const RESULT_WINDOW_MS = 48 * 60 * 60 * 1000;

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11)
    return `${n}st`;
  if (rem10 === 2 && rem100 !== 12)
    return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13)
    return `${n}rd`;
  return `${n}th`;
}

/**
 * S7-01 §5: pure ranking function for the Home headline card.
 * Priority: declaration racing today → result within 48h → latest news → welcome.
 */
export function selectHeadline(input: HeadlineInput, now: Date): Headline {
  const { nextRun, latestResult, latestNews } = input;

  if (nextRun && isSameUtcDay(new Date(nextRun.race.postTime), now)) {
    const time = new Date(nextRun.race.postTime).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    });
    const jockeyClause = nextRun.jockey ? ` · ${nextRun.jockey.name} rides` : '';
    return {
      kind: 'declaration',
      eyebrow: 'Racing today',
      title: `${nextRun.horse.name} runs today`,
      subtitle: `${time} at ${nextRun.race.meeting.course.name}${jockeyClause}`,
      cta: { label: 'View horse', href: `/stables/${nextRun.horse.id}` },
    };
  }

  if (
    latestResult
    && now.getTime() - new Date(latestResult.race.postTime).getTime() <= RESULT_WINDOW_MS
  ) {
    const position = latestResult.finishingPosition;
    return {
      kind: 'result',
      eyebrow: 'Result just in',
      title: position != null
        ? `${latestResult.horse.name} finished ${ordinal(position)}`
        : `${latestResult.horse.name} ran`,
      subtitle: `At ${latestResult.race.meeting.course.name}`,
      cta: { label: 'See the race', href: `/stables/${latestResult.horse.id}` },
    };
  }

  if (latestNews) {
    return {
      kind: 'news',
      eyebrow: 'Latest news',
      title: latestNews.title,
      subtitle: latestNews.subtitle,
      cta: { label: 'Read more', href: `/news/${latestNews.slug}` },
    };
  }

  return {
    kind: 'welcome',
    eyebrow: 'Rionna',
    title: 'Welcome to the club',
    subtitle: 'Updates from your horses, the community and the yard will appear here.',
    cta: null,
  };
}
