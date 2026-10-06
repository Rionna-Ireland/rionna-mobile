import { centredMarkRect, flightTransform, IDENTITY, isUsableRect, lockupRects, welcomeMarkRect } from './arrival-geometry';
import { waveDelay, waveTiles } from './pattern-wave';

const WINDOW = { width: 390, height: 844 };

describe('arrival geometry', () => {
  it('centres the mark', () => {
    const r = centredMarkRect(WINDOW, 80);
    expect(r.x).toBe(155);
    expect(r.y + r.height / 2).toBeCloseTo(422);
  });

  it('flies centre to centre and scales by width', () => {
    const from = { x: 100, y: 100, width: 80, height: 72 };
    const to = { x: 16, y: 60, width: 36, height: 32.4 };
    const t = flightTransform(from, to);
    expect(t.scale).toBeCloseTo(0.45);
    expect(t.translateX).toBeCloseTo(34 - 140);
    expect(t.translateY).toBeCloseTo(76.2 - 136);
    expect(flightTransform({ ...from, width: 0 }, to)).toBe(IDENTITY);
  });

  it('lockup: the head and letters tile the 212pt wordmark', () => {
    const { head, letters } = lockupRects(WINDOW);
    expect(head.x).toBe(89);
    expect(head.width).toBeCloseTo(37.53, 1);
    expect(letters.x + letters.width).toBeCloseTo(89 + 212);
    expect(letters.x).toBeGreaterThan(head.x + head.width);
    expect(head.height).toBeCloseTo(letters.height);
  });

  it('welcome mark sits 100pt from the top', () => {
    expect(welcomeMarkRect(WINDOW)).toMatchObject({ x: 169, y: 100, width: 52 });
  });

  it('rejects unusable slots', () => {
    expect(isUsableRect(null, WINDOW)).toBe(false);
    expect(isUsableRect({ x: 0, y: 0, width: 0, height: 10 }, WINDOW)).toBe(false);
    expect(isUsableRect({ x: 0, y: 900, width: 36, height: 32 }, WINDOW)).toBe(false);
    expect(isUsableRect({ x: 16, y: 60, width: 36, height: 32 }, WINDOW)).toBe(true);
  });
});

describe('pattern wave', () => {
  it('delays each diagonal by 90ms', () => {
    expect(waveDelay(0, 0)).toBe(0);
    expect(waveDelay(2, 3)).toBe(450);
  });

  it('covers the box; low-end draws half (a checkerboard)', () => {
    const high = waveTiles(WINDOW, 'high', 96);
    expect(high).toHaveLength(5 * 9);
    const low = waveTiles(WINDOW, 'low', 96);
    expect(low.length).toBe(Math.ceil(high.length / 2));
    expect(low.every(t => (t.col + t.row) % 2 === 0)).toBe(true);
    expect(waveTiles({ width: 0, height: 100 }, 'high')).toEqual([]);
  });
});
