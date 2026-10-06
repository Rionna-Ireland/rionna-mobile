import type { EntryExitAnimationFunction } from 'react-native-reanimated';
import { withSpring, withTiming } from 'react-native-reanimated';

import { springs, timings } from './tokens';

/**
 * Paged content swap (S14-02 §10, Events calendar month paging): the new page
 * slides in from the side it came from on the `gentle` spring while fading
 * up. A short travel rather than a full-width pager keeps it quiet: the grid
 * is re-keyed per page, so this is the new page's `entering`.
 *
 * Reduce Motion: a `quick` opacity fade, no travel.
 */

/** Horizontal travel (pt) of an incoming page. */
export const PAGE_SLIDE = 32;

/** +1 = the next page (arrives from the right), -1 = the previous one (from the left). */
export type PageDirection = 1 | -1;

export function pageSlideEntering(direction: PageDirection, reduceMotion: boolean): EntryExitAnimationFunction {
  if (reduceMotion) {
    const fade = timings.reducedFade;
    return () => {
      'worklet';
      return {
        initialValues: { opacity: 0 },
        animations: { opacity: withTiming(1, fade) },
      };
    };
  }
  const from = direction * PAGE_SLIDE;
  const spring = springs.gentle;
  const fade = timings.enter;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateX: from }] },
      animations: {
        opacity: withTiming(1, fade),
        transform: [{ translateX: withSpring(0, spring) }],
      },
    };
  };
}
