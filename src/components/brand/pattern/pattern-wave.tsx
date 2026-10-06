import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { TileSpec } from './tile-data';
import type { WaveTile } from '@/lib/motion';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { useMotion, waveTileOpacity, waveTiles } from '@/lib/motion';
import { TILE_UNITS } from './tile-data';
import { resolveTileSize } from './tile-layout';
import { TileSpurs } from './tiles';

export type PatternWaveProps = {
  /** The lit colourway of the card's pattern (e.g. `plumLit` over `plum`). */
  spec: TileSpec;
  /** Wave clock in ms (see `playWave`); every tile reads it on the UI thread. */
  clock: SharedValue<number>;
  /** Same as the `PatternFill` underneath, so the lit tiles sit exactly on it. */
  tileSize?: number;
  borderRadius?: number;
  testID?: string;
};

const styles = StyleSheet.create({ root: { overflow: 'hidden' } });

type WaveTileViewProps = { tile: WaveTile; size: number; spec: TileSpec; clock: SharedValue<number> };

/** One lit tile: a static two-star Svg whose View opacity follows the clock. */
function WaveTileView({ tile, size, spec, clock }: WaveTileViewProps) {
  const { delay } = tile;
  const style = useAnimatedStyle(() => ({ opacity: waveTileOpacity(clock.get(), delay) }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: tile.col * size, top: tile.row * size, width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${TILE_UNITS} ${TILE_UNITS}`}>
        <TileSpurs spec={spec} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The lit layer of the S14-06 pattern wave: lays out the same grid as
 * `PatternFill` and fades each tile's lit spurs in and out on the diagonal.
 * Opacity-only on plain Views (no SVG re-render per frame); low-end devices
 * animate every second tile. Mount it only when a wave will play.
 */
function PatternWaveImpl({ spec, clock, tileSize, borderRadius = 0, testID }: PatternWaveProps) {
  const { deviceClass } = useMotion();
  const [box, setBox] = React.useState({ width: 0, height: 0 });

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const grid = React.useMemo(() => {
    if (box.width <= 0 || box.height <= 0)
      return null;
    const size = resolveTileSize(box.width, box.height, tileSize);
    return { size, tiles: waveTiles(Math.ceil(box.width / size), Math.ceil(box.height / size), deviceClass) };
  }, [box.width, box.height, tileSize, deviceClass]);

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, styles.root, { borderRadius }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {grid?.tiles.map(tile => (
        <WaveTileView key={`${tile.row}:${tile.col}`} tile={tile} size={grid.size} spec={spec} clock={clock} />
      ))}
    </View>
  );
}

export const PatternWave = React.memo(PatternWaveImpl);
