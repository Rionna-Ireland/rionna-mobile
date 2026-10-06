import type { SlotName } from './lib/arrival-machine';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useArrival } from './arrival-context';
import { isActive, targetSlot } from './lib/arrival-machine';

export type ArrivalSlotProps = {
  name: SlotName;
  children: React.ReactNode;
  testID?: string;
};

/**
 * Wraps a screen's real submark (Home header, login) so the Arrival mark can
 * land on it (S14-04 §4): reports its window rect on layout, and stays hidden
 * while an arrival is headed here, revealed in the same frame the overlay mark
 * is swapped out. Without an arrival it's a plain wrapper.
 */
export function ArrivalSlot({ name, children, testID }: ArrivalSlotProps) {
  const { state, values, reportSlot } = useArrival();
  const ref = React.useRef<View>(null);
  const active = isActive(state);
  const hidden = active && targetSlot(state.mode) === name;
  const visible = useSharedValue(1);
  const opacity = values?.slot ?? visible;
  const style = useAnimatedStyle(() => ({ opacity: hidden ? opacity.get() : 1 }));

  const measure = React.useCallback(() => {
    if (!active)
      return;
    ref.current?.measureInWindow((...[x, y, width, height]: [number, number, number, number]) => {
      if (width > 0 && height > 0)
        reportSlot(name, { x, y, width, height });
    });
  }, [active, name, reportSlot]);

  // Re-measure on every phase change too: a new run (the welcome after
  // sign-in) finds a slot already mounted, and late layout shifts (safe-area
  // insets resolving) don't fire this view's onLayout. The last one before the
  // hand-off is the fill, by which time layout has settled.
  React.useEffect(measure, [measure, state.run, state.phase]);

  return (
    <Animated.View testID={testID} style={style}>
      <View ref={ref} collapsable={false} onLayout={measure}>
        {children}
      </View>
    </Animated.View>
  );
}

/**
 * The destination's data is in: Home calls this with its first-load state so
 * the arrival hands off at `max(fill, data)` (S14-04 §3).
 */
export function useArrivalReady(name: SlotName, ready: boolean) {
  const { state, reportReady } = useArrival();
  const waiting = isActive(state) && targetSlot(state.mode) === name && !state.ready[name];
  React.useEffect(() => {
    if (waiting && ready)
      reportReady(name);
  }, [waiting, ready, name, reportReady, state.run]);
}
