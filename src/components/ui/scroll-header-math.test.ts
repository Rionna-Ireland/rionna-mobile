import {
  collapseProgress,
  compactTitleOpacity,
  hairlineOpacity,
  heroHandoffProgress,
  LARGE_TITLE_MIN_SCALE,
  largeTitleFrame,
  scrollProgress,
} from './scroll-header-math';

describe('scroll header maths', () => {
  it('maps scroll 0→60pt to collapse 0→1, clamped (pull-to-refresh stays at 0)', () => {
    expect(collapseProgress(-80)).toBe(0);
    expect(collapseProgress(0)).toBe(0);
    expect(collapseProgress(30)).toBeCloseTo(0.5);
    expect(collapseProgress(60)).toBe(1);
    expect(collapseProgress(400)).toBe(1);
  });

  it('fades and scales the large title, scale-free under Reduce Motion', () => {
    expect(largeTitleFrame(0, false)).toEqual({ opacity: 1, scale: 1 });
    expect(largeTitleFrame(1, false)).toEqual({ opacity: 0, scale: LARGE_TITLE_MIN_SCALE });
    expect(largeTitleFrame(0.8, false).opacity).toBeCloseTo(0);
    expect(largeTitleFrame(0.4, false).opacity).toBeCloseTo(0.5);
    expect(largeTitleFrame(1, true)).toEqual({ opacity: 0, scale: 1 });
    expect(largeTitleFrame(0.5, true).scale).toBe(1);
  });

  it('fades the compact title in over the second half', () => {
    expect(compactTitleOpacity(0)).toBe(0);
    expect(compactTitleOpacity(0.5)).toBe(0);
    expect(compactTitleOpacity(0.75)).toBeCloseTo(0.5);
    expect(compactTitleOpacity(1)).toBe(1);
  });

  it('fades the kicker hairline in over the first 16pt', () => {
    expect(hairlineOpacity(-10)).toBe(0);
    expect(hairlineOpacity(8)).toBeCloseTo(0.5);
    expect(hairlineOpacity(16)).toBe(1);
  });

  it('hands the horse bar over as the hero passes under it', () => {
    // hero 400, bar 100 → crossfade between 276 and 300.
    expect(heroHandoffProgress(0, 400, 100)).toBe(0);
    expect(heroHandoffProgress(276, 400, 100)).toBe(0);
    expect(heroHandoffProgress(288, 400, 100)).toBeCloseTo(0.5);
    expect(heroHandoffProgress(300, 400, 100)).toBe(1);
    // Hero not measured yet: stay on the photo treatment.
    expect(heroHandoffProgress(500, 0, 100)).toBe(0);
  });

  it('treats an empty range as a step', () => {
    expect(scrollProgress(9, 10, 10)).toBe(0);
    expect(scrollProgress(10, 10, 10)).toBe(1);
  });
});
