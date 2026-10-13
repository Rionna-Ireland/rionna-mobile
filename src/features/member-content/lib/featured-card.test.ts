import { featuredCardHref, formatFeaturedWhen, toFeaturedCardData } from '@/features/member-content/lib/featured-card';

// Local-time constructor so the output doesn't depend on the TZ. 2030-09-05 is a Thursday.
function local(h: number, m = 0) {
  return new Date(2030, 8, 5, h, m).toISOString();
}

describe('featured card mapping', () => {
  it('formats weekday and clock', () => {
    expect(formatFeaturedWhen(local(20))).toBe('Thursday 8pm');
    expect(formatFeaturedWhen(local(20, 30))).toBe('Thursday 8:30pm');
    expect(formatFeaturedWhen(local(0))).toBe('Thursday 12am');
    expect(formatFeaturedWhen(local(12, 5))).toBe('Thursday 12:05pm');
    expect(formatFeaturedWhen('nope')).toBeNull();
  });

  it('maps the backend card to FeaturedCardData', () => {
    expect(toFeaturedCardData({
      kind: 'qa',
      eventId: 'evt-1',
      title: 'Ask the trainer',
      startsAt: local(20),
      cta: 'Submit questions now',
    })).toEqual({
      id: 'evt-1',
      kicker: 'Live Q&A · Thursday 8pm',
      title: 'Ask the trainer',
      subtitle: 'Submit questions now',
    });
  });

  it('carries the questions thread when the backend provides one', () => {
    expect(toFeaturedCardData({
      kind: 'qa',
      eventId: 'evt-1',
      title: 'Ask',
      startsAt: local(20),
      cta: 'Submit questions now',
      questionsPostId: '900',
      questionsSpaceId: '12',
    })?.questionsPost).toEqual({ spaceId: '12', postId: '900' });
  });

  it('is null without a featured card and degrades on a bad date', () => {
    expect(toFeaturedCardData(null)).toBeNull();
    expect(toFeaturedCardData(undefined)).toBeNull();
    expect(toFeaturedCardData({ kind: 'qa', eventId: 'e', title: 'T', startsAt: 'x', cta: '' }))
      .toEqual({ id: 'e', kicker: 'Live Q&A', title: 'T', subtitle: undefined });
  });
});

describe('featuredCardHref', () => {
  it('opens the questions thread when present, otherwise the event', () => {
    const base = { id: 'evt-1', kicker: 'k', title: 't' };
    expect(featuredCardHref({ ...base, questionsPost: { spaceId: '12', postId: '900' } })).toBe('/post/12/900');
    expect(featuredCardHref(base)).toEqual({ pathname: '/event/[event-id]', params: { 'event-id': 'evt-1' } });
  });
});
