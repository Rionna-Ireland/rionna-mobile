import {
  countUpPlan,
  hasPlayedThisSession,
  lastSeenKey,
  markPlayedThisSession,
  parseLastSeen,
  resetCharityCounterSession,
  VISIBILITY_THRESHOLD,
  visibleFraction,
  wholeEuros,
} from './charity-counter';

const base = { reduceMotion: false, playedThisSession: false };

describe('countUpPlan (start value)', () => {
  it('a first-ever view counts from €0', () => {
    expect(countUpPlan({ ...base, lastSeenCents: null, totalCents: 2_450_000 })).toEqual({ from: 0, to: 24_500, animate: true });
  });

  it('a later view counts only the increase', () => {
    expect(countUpPlan({ ...base, lastSeenCents: 2_400_000, totalCents: 2_450_000 })).toEqual({ from: 24_000, to: 24_500, animate: true });
  });

  it('an unchanged total is static', () => {
    expect(countUpPlan({ ...base, lastSeenCents: 2_450_000, totalCents: 2_450_000 })).toEqual({ from: 24_500, to: 24_500, animate: false });
    // A cents-only change doesn't move the displayed euros.
    expect(countUpPlan({ ...base, lastSeenCents: 2_450_000, totalCents: 2_450_050 }).animate).toBe(false);
  });

  it('a lower total (correction) is static at the new total', () => {
    expect(countUpPlan({ ...base, lastSeenCents: 3_000_000, totalCents: 2_450_000 })).toEqual({ from: 24_500, to: 24_500, animate: false });
  });

  it('a zero total on a first view is static', () => {
    expect(countUpPlan({ ...base, lastSeenCents: null, totalCents: 0 }).animate).toBe(false);
  });

  it('reduce motion and a second showing this session are static', () => {
    expect(countUpPlan({ ...base, reduceMotion: true, lastSeenCents: null, totalCents: 2_450_000 })).toEqual({ from: 24_500, to: 24_500, animate: false });
    expect(countUpPlan({ ...base, playedThisSession: true, lastSeenCents: 100, totalCents: 2_450_000 }).animate).toBe(false);
  });

  it('whole euros floor and never go negative', () => {
    expect(wholeEuros(2_450_099)).toBe(24_500);
    expect(wholeEuros(-100)).toBe(0);
  });
});

describe('last-seen persistence helpers', () => {
  it('keys per member and per surface', () => {
    expect(lastSeenKey('m1', 'home')).toBe('charity:last-seen:m1:home');
    expect(lastSeenKey('m1', 'charity')).not.toBe(lastSeenKey('m1', 'home'));
  });

  it('only trusts finite non-negative numbers', () => {
    expect(parseLastSeen(2_450_000)).toBe(2_450_000);
    expect(parseLastSeen(0)).toBe(0);
    for (const bad of [null, undefined, '100', -1, Number.NaN, Infinity])
      expect(parseLastSeen(bad)).toBeNull();
  });
});

describe('session memory', () => {
  afterEach(resetCharityCounterSession);

  it('remembers a surface once played', () => {
    expect(hasPlayedThisSession('k')).toBe(false);
    markPlayedThisSession('k');
    expect(hasPlayedThisSession('k')).toBe(true);
  });
});

describe('visibleFraction', () => {
  it('measures the share of the card inside the viewport', () => {
    // Fully inside.
    expect(visibleFraction({ top: 100, height: 200 }, { top: 0, bottom: 800 })).toBe(1);
    // Below the fold.
    expect(visibleFraction({ top: 900, height: 200 }, { top: 0, bottom: 800 })).toBe(0);
    // 60% showing at the bottom edge.
    expect(visibleFraction({ top: 680, height: 200 }, { top: 0, bottom: 800 })).toBeCloseTo(0.6);
    // Scrolled half off the top.
    expect(visibleFraction({ top: -100, height: 200 }, { top: 0, bottom: 800 })).toBe(0.5);
  });

  it('crosses the 60% threshold at the right point', () => {
    expect(visibleFraction({ top: 690, height: 200 }, { top: 0, bottom: 800 })).toBeLessThan(VISIBILITY_THRESHOLD);
    expect(visibleFraction({ top: 679, height: 200 }, { top: 0, bottom: 800 })).toBeGreaterThanOrEqual(VISIBILITY_THRESHOLD);
  });

  it('a card taller than the viewport counts when it fills it; empty boxes never do', () => {
    expect(visibleFraction({ top: -50, height: 2000 }, { top: 0, bottom: 800 })).toBe(1);
    expect(visibleFraction({ top: 0, height: 0 }, { top: 0, bottom: 800 })).toBe(0);
    expect(visibleFraction({ top: 0, height: 100 }, { top: 0, bottom: 0 })).toBe(0);
  });
});
