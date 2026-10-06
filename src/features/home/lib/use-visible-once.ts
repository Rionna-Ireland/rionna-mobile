import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type Animated from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { measure, useAnimatedReaction, useAnimatedRef, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { VISIBILITY_THRESHOLD, visibleFraction } from '@/features/paddock/lib/charity-counter';

/**
 * Calls `onVisible` once, the first time the referenced view is at least
 * `VISIBILITY_THRESHOLD` (60%) inside the viewport above the floating tab
 * bar while the screen is focused (S14-06 §5). The check runs on the UI
 * thread off the screen's scroll offset (no JS per scroll frame), plus on
 * layout and focus for cards that are already on screen.
 */
export function useVisibleOnce(scrollY: SharedValue<number>, onVisible: () => void) {
  const ref = useAnimatedRef<Animated.View>();
  const { height: windowHeight } = useWindowDimensions();
  const viewBottom = windowHeight - useTabBarContentPadding(0);
  const fired = useSharedValue(false);
  const focused = useSharedValue(false);

  const check = React.useCallback(() => {
    'worklet';
    if (fired.get() || !focused.get())
      return;
    const box = measure(ref);
    if (!box)
      return;
    if (visibleFraction({ top: box.pageY, height: box.height }, { top: 0, bottom: viewBottom }) >= VISIBILITY_THRESHOLD) {
      fired.set(true);
      scheduleOnRN(onVisible);
    }
  }, [fired, focused, ref, viewBottom, onVisible]);

  useAnimatedReaction(() => scrollY.get(), () => check(), [check]);

  useFocusEffect(React.useCallback(() => {
    focused.set(true);
    scheduleOnUI(check);
    return () => focused.set(false);
  }, [focused, check]));

  const onLayout = React.useCallback((_e: LayoutChangeEvent) => {
    scheduleOnUI(check);
  }, [check]);

  return { ref, onLayout };
}
