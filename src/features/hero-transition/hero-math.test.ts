import {
  coverRect,
  endNameOpacity,
  frameCheck,
  heroFrameAtScroll,
  heroScrollStyle,
  innerImageTransform,
  isRectOnscreen,
  lerpRect,
  measuredRect,
  startNameOpacity,
  visibleFraction,
} from './hero-math';

const card = { x: 32, y: 300, width: 86, height: 146 };
const hero = { x: 0, y: 0, width: 390, height: 390 };
const viewport = { x: 0, y: 100, width: 390, height: 600 };

describe('lerpRect', () => {
  it('returns the endpoints at 0 and 1 and blends between', () => {
    expect(lerpRect(card, hero, 0)).toEqual(card);
    expect(lerpRect(card, hero, 1)).toEqual(hero);
    expect(lerpRect(card, hero, 0.5)).toEqual({ x: 16, y: 150, width: 238, height: 268 });
  });
});

describe('coverRect', () => {
  it('covers a portrait frame with a landscape image, centred horizontally', () => {
    const image = coverRect(1.5, card);
    expect(image.height).toBe(146);
    expect(image.width).toBeCloseTo(219);
    expect(image.x).toBeCloseTo(32 - (219 - 86) / 2);
    expect(image.y).toBe(300);
  });

  it('covers a wide frame with a portrait image, centred vertically', () => {
    const image = coverRect(0.5, { x: 0, y: 0, width: 100, height: 100 });
    expect(image).toEqual({ x: 0, y: -50, width: 100, height: 200 });
  });

  it('falls back to the frame for an unknown aspect or an empty frame', () => {
    expect(coverRect(0, card)).toBe(card);
    expect(coverRect(Number.NaN, card)).toBe(card);
  });

  it('keeps covering the clip at every blend of two cover boxes', () => {
    const aspect = 1.5;
    const from = coverRect(aspect, card);
    const to = coverRect(aspect, hero);
    for (const t of [0, 0.25, 0.5, 0.75, 1, 1.04]) {
      const clip = lerpRect(card, hero, t);
      const image = lerpRect(from, to, t);
      expect(image.x).toBeLessThanOrEqual(clip.x + 1e-9);
      expect(image.y).toBeLessThanOrEqual(clip.y + 1e-9);
      expect(image.x + image.width).toBeGreaterThanOrEqual(clip.x + clip.width - 1e-9);
      expect(image.y + image.height).toBeGreaterThanOrEqual(clip.y + clip.height - 1e-9);
      expect(image.width / image.height).toBeCloseTo(aspect);
    }
  });
});

describe('innerImageTransform', () => {
  it('is the identity when the image box is the base box at the clip origin', () => {
    const base = { width: 200, height: 100 };
    expect(innerImageTransform({ x: 10, y: 20, width: 200, height: 100 }, { x: 10, y: 20, width: 50, height: 50 }, base))
      .toEqual({ translateX: 0, translateY: 0, scale: 1 });
  });

  it('moves the centre onto the image box and scales to its width', () => {
    const base = { width: 200, height: 100 };
    const t = innerImageTransform({ x: 0, y: 0, width: 100, height: 50 }, { x: 0, y: 0, width: 100, height: 50 }, base);
    // Scaled 0.5 around the centre (100, 50) → occupies 50..150; shift −50 so it starts at 0.
    expect(t).toEqual({ translateX: -50, translateY: -25, scale: 0.5 });
  });

  it('is safe with an empty base', () => {
    expect(innerImageTransform(hero, hero, { width: 0, height: 0 })).toEqual({ translateX: 0, translateY: 0, scale: 1 });
  });
});

describe('visibility', () => {
  it('measures the fraction inside the viewport', () => {
    expect(visibleFraction({ x: 0, y: 100, width: 10, height: 10 }, viewport)).toBe(1);
    expect(visibleFraction({ x: 0, y: 95, width: 10, height: 10 }, viewport)).toBeCloseTo(0.5);
    expect(visibleFraction({ x: 0, y: 0, width: 10, height: 10 }, viewport)).toBe(0);
    expect(visibleFraction({ x: 0, y: 0, width: 0, height: 10 }, viewport)).toBe(0);
  });

  it('only counts a fully visible source as on screen', () => {
    expect(isRectOnscreen(card, viewport)).toBe(true);
    expect(isRectOnscreen({ ...card, y: 650 }, viewport)).toBe(false);
    expect(isRectOnscreen({ ...card, y: 90 }, viewport)).toBe(false);
    expect(isRectOnscreen({ ...card, y: 99.5 }, viewport)).toBe(true);
    expect(isRectOnscreen(null, viewport)).toBe(false);
  });
});

describe('heroFrameAtScroll', () => {
  it('is the hero rect, covered, at rest', () => {
    const frame = heroFrameAtScroll(hero, 0, { parallax: 0.5, aspect: 1 });
    expect(frame.clip).toEqual(hero);
    expect(frame.image).toEqual(hero);
  });

  it('starts the clip at the parallaxed photo top and ends at the hero bottom', () => {
    const frame = heroFrameAtScroll(hero, 100, { parallax: 0.5, aspect: 1 });
    expect(frame.clip).toEqual({ x: 0, y: -50, width: 390, height: 340 });
    expect(frame.image).toEqual({ x: 0, y: -50, width: 390, height: 390 });
  });

  it('treats overscroll as rest', () => {
    expect(heroFrameAtScroll(hero, -40, { parallax: 0.5, aspect: 1 }).clip).toEqual(hero);
  });
});

describe('heroScrollStyle', () => {
  it('rests at 0 and when disabled', () => {
    expect(heroScrollStyle(0, { heroHeight: 390, parallax: 0.5, enabled: true })).toEqual({ wrapperTranslateY: 0, wrapperScale: 1, photoTranslateY: 0 });
    expect(heroScrollStyle(120, { heroHeight: 390, parallax: 0.5, enabled: false })).toEqual({ wrapperTranslateY: 0, wrapperScale: 1, photoTranslateY: 0 });
    expect(heroScrollStyle(-60, { heroHeight: 390, parallax: 0.5, enabled: false }).wrapperScale).toBe(1);
  });

  it('drifts the photo so it travels at half the scroll speed', () => {
    // Content moved up 100; the photo moves down 50 inside it → on screen it moved up 50.
    expect(heroScrollStyle(100, { heroHeight: 390, parallax: 0.5, enabled: true }).photoTranslateY).toBe(50);
    expect(heroScrollStyle(1000, { heroHeight: 390, parallax: 0.5, enabled: true }).photoTranslateY).toBe(195);
  });

  it('stretches from the top anchor on overscroll', () => {
    const style = heroScrollStyle(-78, { heroHeight: 390, parallax: 0.5, enabled: true });
    expect(style.wrapperTranslateY).toBe(-78);
    expect(style.wrapperScale).toBeCloseTo(1.2);
    // Top edge pinned at the window top: the bottom stays glued to the hero's bottom.
    expect(-78 + 390 * style.wrapperScale).toBeCloseTo(390);
  });

  it('holds before the hero has a height', () => {
    expect(heroScrollStyle(-50, { heroHeight: 0, parallax: 0.5, enabled: true }).wrapperScale).toBe(1);
  });
});

describe('measuredRect', () => {
  it('reads measureInWindow values, rejecting an unlaid-out view', () => {
    expect(measuredRect([1, 2, 3, 4])).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(measuredRect([1, 2, 0, 4])).toBeNull();
    expect(measuredRect([])).toBeNull();
  });
});

describe('frameCheck', () => {
  it('keeps watching until it has enough frames', () => {
    expect(frameCheck([], 3, 25)).toBe('watching');
    expect(frameCheck([40, 40], 3, 25)).toBe('watching');
  });

  it('aborts only when every watched frame dropped', () => {
    expect(frameCheck([40, 34, 50], 3, 25)).toBe('abort');
    expect(frameCheck([60, 16.7, 16.7], 3, 25)).toBe('ok');
    expect(frameCheck([16.7, 16.7, 40], 3, 25)).toBe('ok');
    expect(frameCheck([8.3, 8.3, 8.3], 3, 25)).toBe('ok');
  });
});

describe('name crossfade', () => {
  it('hands the card name to the hero name across the flight', () => {
    expect(startNameOpacity(0)).toBe(1);
    expect(startNameOpacity(0.25)).toBe(0.5);
    expect(startNameOpacity(0.6)).toBe(0);
    expect(endNameOpacity(0.3)).toBe(0);
    expect(endNameOpacity(0.7)).toBeCloseTo(0.5);
    expect(endNameOpacity(1.05)).toBe(1);
  });
});
