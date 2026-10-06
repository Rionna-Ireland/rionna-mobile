import type { WaveTile } from './lib/pattern-wave';
import * as React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { PatternTile } from '@/components/brand/pattern';
import { arrival, timings, useMotion } from '@/lib/motion';

import { WAVE_TILE_SIZE, waveTiles } from './lib/pattern-wave';

/** The waitlist's tile in the lilac/cream colourway (S14-04 §6). */
const WAVE_SPEC = { kind: 'harlequin', colourway: 'cream', turn: 0 } as const;

function Tile({ tile }: { tile: WaveTile }) {
  const opacity = useSharedValue(0);
  React.useEffect(() => {
    opacity.set(withDelay(tile.delay, withTiming(arrival.waveTileOpacity, timings.enterSlow)));
  }, [opacity, tile.delay]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[styles.tile, { left: tile.col * WAVE_TILE_SIZE, top: tile.row * WAVE_TILE_SIZE }, style]}
    >
      <PatternTile spec={WAVE_SPEC} size={WAVE_TILE_SIZE} />
    </Animated.View>
  );
}

/**
 * First-login pattern wave: tiles fade 0 → 0.12 on the diagonal
 * `(col + row) × 90ms` delay. Half the tiles on low-end; none under Reduce
 * Motion (S14-04 §6–7).
 */
export function PatternWave() {
  const { reduceMotion, deviceClass } = useMotion();
  const { width, height } = useWindowDimensions();
  const tiles = React.useMemo(() => waveTiles({ width, height }, deviceClass), [width, height, deviceClass]);
  if (reduceMotion)
    return null;
  return (
    <View testID="arrival-wave" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tiles.map(tile => <Tile key={`${tile.col}:${tile.row}`} tile={tile} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'absolute', width: WAVE_TILE_SIZE, height: WAVE_TILE_SIZE },
});
