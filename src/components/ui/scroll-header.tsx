/* eslint-disable react-refresh/only-export-components */
import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useMotion } from '@/lib/motion';

import colors from './colors';
import { withAlpha } from './gradient-styles';
import { useScreenTopPadding } from './screen-layout';
import {
  collapseProgress,
  COMPACT_BAR_HEIGHT,
  compactTitleOpacity,
  hairlineOpacity,
  largeTitleFrame,
} from './scroll-header-math';
import { Text } from './text';

/**
 * Scroll-linked headers (S14-02 §5).
 *
 * - `useScrollHeader()`: a shared scroll offset plus a UI-thread
 *   `useAnimatedScrollHandler` for `AnimatedScrollView` (and `onScrollJS`
 *   for lists that already handle scroll on JS, e.g. FlashList).
 * - Tab roots: wrap the `display-lg` title in `CollapsingTitle` and overlay a
 *   `CompactHeaderBar`. Over 0→60pt the large title fades and shrinks while
 *   the 44pt bar fades in a `surface` @90% fill, a hairline and the centred
 *   `title`. The fill covers the status bar too: that's the scrim (no blur,
 *   S14-01).
 * - Kicker screens: pass `scrollY` to `ScreenHeader` for the hairline.
 *
 * Reduce Motion: opacity only (no title scale).
 */

/** `ScrollView` that accepts a Reanimated scroll handler; refresh control and refs work as usual. */
export const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export function useScrollHeader() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
  });
  const onScrollJS = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.set(event.nativeEvent.contentOffset.y);
  }, [scrollY]);
  return { scrollY, onScroll, onScrollJS };
}

/** The tab root's large title: fades (and, motion allowing, shrinks from the left) as it collapses. */
export function CollapsingTitle({ scrollY, children, style }: { scrollY: SharedValue<number>; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useMotion();
  const animatedStyle = useAnimatedStyle(() => {
    const frame = largeTitleFrame(collapseProgress(scrollY.get()), reduceMotion);
    return { opacity: frame.opacity, transform: [{ scale: frame.scale }] };
  });
  return <Animated.View style={[styles.titleOrigin, style, animatedStyle]}>{children}</Animated.View>;
}

/** Hairline at the bottom of a header, fading in as content scrolls under it. */
export function ScrollHairline({ scrollY, testID }: { scrollY: SharedValue<number>; testID?: string }) {
  const animatedStyle = useAnimatedStyle(() => ({ opacity: hairlineOpacity(scrollY.get()) }));
  return <Animated.View testID={testID} pointerEvents="none" style={[styles.hairline, animatedStyle]} />;
}

type CompactHeaderBarProps = {
  /** Chrome (fill + hairline) progress, 0–1. Defaults to the tab-root collapse of `scrollY`. */
  progress?: SharedValue<number>;
  scrollY?: SharedValue<number>;
  /** The compact centred title (`title` variant). Omit for a chrome-only bar. */
  title?: string;
  /** Interactive content in the 44pt row (e.g. Horse detail's back/share). */
  children?: React.ReactNode;
  testID?: string;
};

function barProgress(progress?: SharedValue<number>, scrollY?: SharedValue<number>): number {
  'worklet';
  if (progress)
    return progress.get();
  return scrollY ? collapseProgress(scrollY.get()) : 0;
}

/** Fixed compact bar over the top of a scrolling screen: status-bar scrim + 44pt row. */
export function CompactHeaderBar({ progress, scrollY, title, children, testID }: CompactHeaderBarProps) {
  const top = useScreenTopPadding(0);
  const chromeStyle = useAnimatedStyle(() => ({ opacity: barProgress(progress, scrollY) }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: compactTitleOpacity(barProgress(progress, scrollY)) }));

  return (
    <View testID={testID} pointerEvents="box-none" style={[styles.bar, { height: top + COMPACT_BAR_HEIGHT }]}>
      <Animated.View testID={testID ? `${testID}-chrome` : undefined} pointerEvents="none" style={[styles.chrome, chromeStyle]}>
        <View style={styles.hairline} />
      </Animated.View>
      {title
        ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.row, styles.centred, { top }, titleStyle]}
            >
              <Text variant="title" numberOfLines={1}>{title}</Text>
            </Animated.View>
          )
        : null}
      {children
        ? <View pointerEvents="box-none" style={[styles.row, { top }]}>{children}</View>
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleOrigin: { transformOrigin: 'left center' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  chrome: { ...StyleSheet.absoluteFillObject, backgroundColor: withAlpha(colors.surface, 0.9) },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
  row: { position: 'absolute', left: 0, right: 0, height: COMPACT_BAR_HEIGHT, paddingHorizontal: 16 },
  centred: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 64 },
});
