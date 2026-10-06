import { wave, waveStep, waveTileOpacity, waveTiles } from './wave';

describe('pattern wave', () => {
  it('steps 90ms per diagonal: delay = (col + row) × 90', () => {
    const tiles = waveTiles(3, 2);
    expect(tiles).toEqual([
      { col: 0, row: 0, delay: 0 },
      { col: 1, row: 0, delay: 90 },
      { col: 2, row: 0, delay: 180 },
      { col: 0, row: 1, delay: 90 },
      { col: 1, row: 1, delay: 180 },
      { col: 2, row: 1, delay: 270 },
    ]);
  });

  it('compresses the step so the whole wave fits in ~1.2s', () => {
    for (const [cols, rows] of [[4, 3], [6, 2], [12, 1], [2, 6], [30, 30]]) {
      const tiles = waveTiles(cols, rows);
      const last = Math.max(...tiles.map(t => t.delay));
      expect(last + wave.rise + wave.fall).toBeLessThanOrEqual(wave.cap);
    }
    expect(waveStep(3)).toBe(90);
    expect(waveStep(20)).toBeLessThan(90);
    expect(waveStep(0)).toBe(0);
  });

  it('animates every second tile on low-end devices', () => {
    const high = waveTiles(4, 3, 'high');
    const low = waveTiles(4, 3, 'low');
    expect(low).toHaveLength(Math.ceil(high.length / 2));
    // Still crosses the card: the farthest diagonal is reached.
    expect(Math.max(...low.map(t => t.col + t.row))).toBeGreaterThanOrEqual(4);
  });

  it('handles an unmeasured box', () => {
    expect(waveTiles(0, 3)).toEqual([]);
  });

  it('each tile rises then settles back to 0', () => {
    expect(waveTileOpacity(-1, 0)).toBe(0);
    expect(waveTileOpacity(100, 100)).toBe(0);
    expect(waveTileOpacity(100 + wave.rise, 100)).toBe(1);
    const mid = waveTileOpacity(100 + wave.rise + wave.fall / 2, 100);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(waveTileOpacity(100 + wave.rise + wave.fall, 100)).toBe(0);
    expect(waveTileOpacity(wave.cap * 2, 0)).toBe(0);
  });
});
