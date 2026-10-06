/* eslint-disable react-refresh/only-export-components */
import type { StyleProp, ViewStyle } from 'react-native';
import type { EntryExitAnimationFunction } from 'react-native-reanimated';
import type { EntranceFn } from './entrance';
import * as React from 'react';
import Animated, { withTiming } from 'react-native-reanimated';

import { useFirstLoadEntrance } from './entrance';
import { useMotion } from './motion-provider';
import { timings } from './tokens';

/**
 * Skeleton → content (S14-03 §1).
 *
 * Rule: a skeleton shows only on a FIRST load with no cache — react-query's
 * `isPending` (no data yet) while a fetch is actually running. Cached data
 * (memory, persisted snapshot, `initialData`) renders at once and refetches
 * silently; a disabled or offline-paused query shows its empty/error state as
 * before, never an endless skeleton.
 *
 * The swap is an in-place crossfade: the skeleton leaves with a Reanimated
 * `exiting` fade (the native view stays at its last frame while it fades) as
 * the content mounts in the same slot with an `entering` fade, both on the
 * `crossfade` timing (`base`). Skeletons mirror their card's dimensions, so
 * nothing moves.
 *
 * Composing with the S14-02 first-load entrance: when a skeleton was shown,
 * the crossfade IS the first-load entrance, so the staggered fade-up is
 * suppressed (`useContentEntrance`). A rise under a fading skeleton would
 * read as a layout jump. With cache, there's no skeleton and the fade-up
 * plays exactly as S14-02 defined it.
 */

type QueryLoadState = { isPending: boolean; isFetching: boolean };

/** True while a query has no data AND is fetching it: the only time a skeleton shows. */
export function isFirstLoad(query: QueryLoadState): boolean {
  return query.isPending && query.isFetching;
}

/** Latches `true` once `loading` has been true during this mount (set in render, not an effect). */
export function useSkeletonShown(loading: boolean): boolean {
  const [shown, setShown] = React.useState(loading);
  if (loading && !shown)
    setShown(true);
  return shown;
}

function fade(to: 0 | 1, reduceMotion: boolean): EntryExitAnimationFunction {
  const config = reduceMotion ? timings.reducedFade : timings.crossfade;
  const from = to === 1 ? 0 : 1;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: from },
      animations: { opacity: withTiming(to, config) },
    };
  };
}

/** Content fading in over its skeleton. */
export function crossfadeInEntering(reduceMotion = false): EntryExitAnimationFunction {
  return fade(1, reduceMotion);
}

/** Skeleton fading out over the content that replaced it. */
export function crossfadeOutExiting(reduceMotion = false): EntryExitAnimationFunction {
  return fade(0, reduceMotion);
}

const noEntrance: EntranceFn = () => undefined;

/**
 * `useFirstLoadEntrance` that stands down when this mount showed a skeleton:
 * the `SkeletonSwap` crossfade already brought the content in.
 */
export function useContentEntrance(ready: boolean, skeletonShowing: boolean): EntranceFn {
  const hadSkeleton = useSkeletonShown(skeletonShowing);
  const entering = useFirstLoadEntrance(ready);
  return hadSkeleton ? noEntrance : entering;
}

type SkeletonSwapProps = {
  /** Show the skeleton (usually `isFirstLoad(query)`). */
  loading: boolean;
  skeleton: React.ReactNode;
  /** The content. `null` renders nothing (a card with nothing to show), the skeleton still fades out. */
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Renders `skeleton` while `loading`, then crossfades to `children` in the
 * same slot. Mount it inside a parent that stays mounted (the exiting fade
 * needs one). Content that never had a skeleton mounts without a wrapper fade.
 */
export function SkeletonSwap({ loading, skeleton, children, style, testID }: SkeletonSwapProps) {
  const { reduceMotion } = useMotion();
  const hadSkeleton = useSkeletonShown(loading);
  if (loading) {
    return (
      <Animated.View key="skeleton" testID={testID} exiting={crossfadeOutExiting(reduceMotion)} style={style}>
        {skeleton}
      </Animated.View>
    );
  }
  if (children === null || children === undefined || children === false)
    return null;
  return (
    <Animated.View key="content" entering={hadSkeleton ? crossfadeInEntering(reduceMotion) : undefined} style={style}>
      {children}
    </Animated.View>
  );
}
