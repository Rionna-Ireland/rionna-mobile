import type { SharedValue } from 'react-native-reanimated';
import type { DeviceClass } from './motion-provider';
import { Easing, withDelay, withTiming } from 'react-native-reanimated';

import { durations } from './tokens';

/**
 * Pattern wave (S14-06 §3): a card's pattern tiles light up along the
 * diagonal, `(col + row) × step`, each one rising to its lit colourway and
 * settling back. One linear clock (ms) drives every tile, so the whole wave
 * is a single shared value and N cheap opacity styles.
 */
export const wave = {
  /** Delay between neighbouring diagonals. */
  step: 90,
  /** The whole wave (first tile lighting → last tile settled) fits in this. */
  cap: 1200,
  /** A tile lights over `quick`… */
  rise: durations.quick,
  /** …and settles back over `slow`. */
  fall: durations.slow,
} as const;

/** Vote replay (S14-06 §4): the results bars start drawing once the wave crest has passed. */
export const WAVE_BARS_DELAY = durations.slow;

/** Linear clock config: `wave.cap` ms of wall time → the clock reads 0 → `wave.cap`. */
export const waveClockTiming = { duration: wave.cap, easing: Easing.linear };

export type WaveTile = { col: number; row: number; delay: number };

/**
 * Diagonal step for a grid whose farthest tile sits `maxDiagonal` steps from
 * the origin: `wave.step`, compressed so the last tile settles within the cap.
 */
export function waveStep(maxDiagonal: number): number {
  if (maxDiagonal <= 0)
    return 0;
  const room = wave.cap - wave.rise - wave.fall;
  return Math.min(wave.step, room / maxDiagonal);
}

/**
 * The tiles that animate and their delays (ms). Low-end devices animate
 * every second tile (row-major), so the wave still crosses every diagonal.
 */
export function waveTiles(cols: number, rows: number, deviceClass: DeviceClass = 'high'): WaveTile[] {
  if (cols <= 0 || rows <= 0)
    return [];
  const step = waveStep(cols - 1 + rows - 1);
  const tiles: WaveTile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (deviceClass === 'low' && index % 2 === 1)
        continue;
      tiles.push({ col, row, delay: Math.round((col + row) * step) });
    }
  }
  return tiles;
}

function smoothstep(x: number): number {
  'worklet';
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** Lit-layer opacity of a tile with `delay` at clock time `t` (ms): 0 → 1 → 0. */
export function waveTileOpacity(t: number, delay: number): number {
  'worklet';
  const local = t - delay;
  if (local <= 0)
    return 0;
  if (local < wave.rise)
    return smoothstep(local / wave.rise);
  return 1 - smoothstep((local - wave.rise) / wave.fall);
}

/** Restart the wave clock: hold at 0 for `delayMs`, then run 0 → `wave.cap` linearly. */
export function playWave(clock: SharedValue<number>, delayMs = 0) {
  clock.set(0);
  clock.set(withDelay(delayMs, withTiming(wave.cap, waveClockTiming)));
}
