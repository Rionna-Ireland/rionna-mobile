import type { LatestResult, NextRunEntry } from '@/features/pulse/types';

import { selectHeadline } from './select-headline';

const NOW = new Date('2026-07-24T09:00:00Z');

function makeNextRun(postTime: string): NextRunEntry {
  return {
    id: 'e1',
    status: 'DECLARED',
    draw: null,
    weightLbs: null,
    horse: { id: 'h1', name: 'My Boy Harry', photos: [] },
    race: {
      id: 'r1',
      name: null,
      postTime,
      meeting: {
        id: 'm1',
        date: postTime.slice(0, 10),
        course: { id: 'c1', name: 'Brighton' },
      },
    },
    jockey: { id: 'j1', name: 'Rossa Ryan' },
  };
}

function makeResult(postTime: string, position: number | null = 2): LatestResult {
  return {
    id: 'e2',
    finishingPosition: position,
    horse: { id: 'h2', name: 'Chasing Blues' },
    race: { id: 'r2', postTime, meeting: { course: { name: 'Kempton' } } },
  };
}

const NEWS = {
  id: 'n1',
  slug: 'summer-update',
  title: 'Summer update',
  subtitle: null,
  featuredImageUrl: null,
  publishedAt: '2026-07-20T10:00:00Z',
  author: null,
};

describe('selectHeadline', () => {
  it('picks a declaration racing today over everything else', () => {
    const headline = selectHeadline(
      {
        nextRun: makeNextRun('2026-07-24T15:30:00Z'),
        latestResult: makeResult('2026-07-23T15:00:00Z'),
        latestNews: NEWS,
      },
      NOW,
    );
    expect(headline.kind).toBe('declaration');
    expect(headline.title).toContain('My Boy Harry');
    expect(headline.cta?.href).toBe('/stables/h1');
  });

  it('skips a future (not today) declaration; recent result wins', () => {
    const headline = selectHeadline(
      {
        nextRun: makeNextRun('2026-07-26T15:30:00Z'),
        latestResult: makeResult('2026-07-23T15:00:00Z'),
        latestNews: NEWS,
      },
      NOW,
    );
    expect(headline.kind).toBe('result');
    expect(headline.cta?.href).toBe('/stables/h2');
  });

  it('skips a result older than 48h; news wins', () => {
    const headline = selectHeadline(
      { nextRun: null, latestResult: makeResult('2026-07-20T15:00:00Z'), latestNews: NEWS },
      NOW,
    );
    expect(headline.kind).toBe('news');
    expect(headline.cta?.href).toBe('/news/summer-update');
  });

  it('falls back to a welcome card with no CTA when nothing qualifies', () => {
    const headline = selectHeadline(
      { nextRun: null, latestResult: null, latestNews: null },
      NOW,
    );
    expect(headline.kind).toBe('welcome');
    expect(headline.cta).toBeNull();
  });

  it('still surfaces a recent result with a null finishing position', () => {
    const headline = selectHeadline(
      { nextRun: null, latestResult: makeResult('2026-07-23T15:00:00Z', null), latestNews: null },
      NOW,
    );
    expect(headline.kind).toBe('result');
    expect(headline.title).toContain('Chasing Blues');
  });
});
