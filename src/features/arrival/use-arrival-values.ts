import type { ArrivalValues } from './arrival-context';
import * as React from 'react';
import { useSharedValue } from 'react-native-reanimated';

/**
 * The overlay's shared values, at their FIRST-FRAME state: nothing drawn on
 * plain white (the native splash), or the mark already filled under Reduce
 * Motion. The destination's real mark starts hidden.
 */
export function useArrivalValues(reduceMotion: boolean): ArrivalValues {
  const start = reduceMotion ? 1 : 0;
  const progress = useSharedValue(start);
  const fill = useSharedValue(start);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const markOpacity = useSharedValue(1);
  const breath = useSharedValue(1);
  const backdrop = useSharedValue(1);
  const bloom = useSharedValue(0);
  const navy = useSharedValue(0);
  const wipe = useSharedValue(0);
  const slot = useSharedValue(0);
  return React.useMemo(
    () => ({ progress, fill, tx, ty, scale, markOpacity, breath, backdrop, bloom, navy, wipe, slot }),
    [progress, fill, tx, ty, scale, markOpacity, breath, backdrop, bloom, navy, wipe, slot],
  );
}
