import type { DeviceClass } from '@/lib/motion';
import { arrival } from '@/lib/motion';

/**
 * The waitlist's diagonal pattern wave (S14-04 §6): every tile fades up with
 * a delay of `(col + row) × 90ms`, so the wave sweeps from the top-left
 * corner. Low-end devices draw half the tiles (a checkerboard; S14-01 §5).
 */

export type WaveTile = { col: number; row: number; delay: number };

export const WAVE_TILE_SIZE = 96;

export function waveDelay(col: number, row: number): number {
  return (col + row) * arrival.waveStepMs;
}

export function waveTiles(
  { width, height }: { width: number; height: number },
  deviceClass: DeviceClass,
  tileSize: number = WAVE_TILE_SIZE,
): WaveTile[] {
  if (width <= 0 || height <= 0 || tileSize <= 0)
    return [];
  const cols = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);
  const tiles: WaveTile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (deviceClass === 'low' && (col + row) % 2 === 1)
        continue;
      tiles.push({ col, row, delay: waveDelay(col, row) });
    }
  }
  return tiles;
}
