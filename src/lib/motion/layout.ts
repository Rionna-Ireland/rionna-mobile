import { LinearTransition } from 'react-native-reanimated';

import { durations, easings } from './tokens';

/**
 * List `layout` transition (S13-19): siblings glide when a row leaves the list
 * (a comment moving up into the pinned slot) on the existing `base` duration and
 * `enter` curve. Reduce Motion: none, rows just reflow.
 */
export function listLayout(reduceMotion: boolean) {
  return reduceMotion ? undefined : LinearTransition.duration(durations.base).easing(easings.enter);
}
