/* eslint-disable react-refresh/only-export-components */
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { EntryExitAnimationFunction } from 'react-native-reanimated';
import * as React from 'react';
import Animated, { withDelay, withTiming } from 'react-native-reanimated';

import { useMotion } from './motion-provider';
import { durations, stagger, staggerDelay, timings } from './tokens';

/**
 * List entrance (S14-02 §6): on a screen's FIRST load only, cards fade up
 * (opacity 0 → 1, translateY 12 → 0) over `base` on the `enter` curve,
 * staggered 40ms per item. Only the first `stagger.maxItems` items animate;
 * the rest appear instantly. Reduce Motion: a `quick` opacity fade, no rise,
 * no stagger.
 *
 * Gating: Reanimated `entering` only runs when a view mounts, so the risk is
 * views that mount LATER — pagination, refetch rows, filter changes, a
 * virtualised list (SectionList, FlashList) mounting cells as you scroll, or
 * FlashList re-creating a cell. `useFirstLoadEntrance` opens a short window
 * when the data first becomes ready (long enough for the first batch to mount
 * and play) and returns `undefined` for every mount after it closes. The
 * phase lives in the screen's state, so tab re-focus (tabs stay mounted),
 * refetch and pull-to-refresh never reopen it.
 */

/** Cards rise this far (pt) as they fade in. */
export const ENTRANCE_RISE = 12;

/**
 * How long the first-load window stays open: the last staggered slot's delay
 * plus one `base` entrance, so nothing mounting after the batch has played can
 * still pick up an entrance.
 */
export const ENTRANCE_WINDOW_MS = staggerDelay(stagger.maxItems - 1) + durations.base;

/**
 * Fade-up `entering` for the item at `index` (callers cap the index).
 * `extraDelayMs` holds the whole batch back, e.g. Horse detail's content
 * rising in behind the hero transition (S14-05 §3).
 */
export function fadeUpEntering(index: number, extraDelayMs = 0): EntryExitAnimationFunction {
  const delay = staggerDelay(index) + extraDelayMs;
  const config = timings.enter;
  const rise = ENTRANCE_RISE;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: rise }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, config)),
        transform: [{ translateY: withDelay(delay, withTiming(0, config)) }],
      },
    };
  };
}

/** Reduce Motion `entering`: a plain `quick` opacity fade, no rise, no delay. */
export function reducedFadeEntering(): EntryExitAnimationFunction {
  const config = timings.reducedFade;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0 },
      animations: { opacity: withTiming(1, config) },
    };
  };
}

/** Pure: the `entering` for `index` while the window is open (undefined once it's past the cap). */
export function entranceFor(index: number, reduceMotion: boolean): EntryExitAnimationFunction | undefined {
  if (index < 0 || index >= stagger.maxItems)
    return undefined;
  return reduceMotion ? reducedFadeEntering() : fadeUpEntering(index);
}

type Phase = 'waiting' | 'open' | 'closed';

export type EntranceFn = (index: number) => EntryExitAnimationFunction | undefined;

/**
 * Per-screen first-load gate. Pass `ready` = the list's data has arrived (not
 * loading). Returns `entering(index)`: an entrance while the first-load window
 * is open, `undefined` before it opens and forever after it closes.
 */
export function useFirstLoadEntrance(ready: boolean): EntranceFn {
  const { reduceMotion } = useMotion();
  const [phase, setPhase] = React.useState<Phase>('waiting');

  // Open in render (not an effect) so the first batch mounts with its entrance.
  if (phase === 'waiting' && ready)
    setPhase('open');

  React.useEffect(() => {
    if (phase !== 'open')
      return;
    const close = setTimeout(() => setPhase('closed'), ENTRANCE_WINDOW_MS);
    return () => clearTimeout(close);
  }, [phase]);

  const open = phase === 'open';
  return React.useCallback(
    (index: number) => (open ? entranceFor(index, reduceMotion) : undefined),
    [open, reduceMotion],
  );
}

type EntranceItemProps = {
  entering: EntryExitAnimationFunction | undefined;
  style?: StyleProp<ViewStyle>;
  onLayout?: ViewProps['onLayout'];
  testID?: string;
  children: React.ReactNode;
};

/** Wraps one list card so it can carry its `entering` animation. */
export function EntranceItem({ entering, style, onLayout, testID, children }: EntranceItemProps) {
  return (
    <Animated.View entering={entering} style={style} onLayout={onLayout} testID={testID}>
      {children}
    </Animated.View>
  );
}
