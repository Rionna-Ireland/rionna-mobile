import { durations, pressScale, pressScaleSmall, springs, stagger, staggerDelay } from './tokens';

describe('motion tokens', () => {
  it('springs are duration + dampingRatio configs (Reanimated 4), never raw physics', () => {
    for (const config of Object.values(springs)) {
      expect(Object.keys(config).sort()).toEqual(['dampingRatio', 'duration']);
      expect(config.dampingRatio).toBeGreaterThanOrEqual(0.95);
    }
    expect(springs.snappy.duration).toBeLessThan(springs.gentle.duration);
    expect(springs.gentle.duration).toBeLessThan(springs.hero.duration);
    expect(springs.hero.duration).toBeLessThan(springs.settle.duration);
  });

  it('has the spec timings', () => {
    expect(durations).toEqual({ instant: 100, quick: 180, base: 280, slow: 450, draw: 900, spin: 900 });
  });

  it('staggerDelay steps 40ms per item and caps at 6 items', () => {
    expect(stagger).toEqual({ step: 40, maxItems: 6 });
    expect([0, 1, 2, 5].map(staggerDelay)).toEqual([0, 40, 80, 200]);
    expect(staggerDelay(6)).toBe(200);
    expect(staggerDelay(50)).toBe(200);
    expect(staggerDelay(-3)).toBe(0);
  });

  it('press scales: small targets press deeper', () => {
    expect(pressScale).toBe(0.97);
    expect(pressScaleSmall).toBe(0.94);
  });
});
