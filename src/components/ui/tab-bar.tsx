import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { SharedValue } from 'react-native-reanimated';
import type { IconV2Props } from '@/components/ui/icons/v2';

import * as React from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { withAlpha } from '@/components/ui/gradient-styles';
import {
  CalendarV2,
  ChatV2,
  HomeV2,
  HorseshoeV2,
  StarV2,
} from '@/components/ui/icons/v2';
import { MotionPressable, RIPPLE_COLOR } from '@/components/ui/pressable';
import {
  TAB_BAR_BORDER,
  TAB_BAR_HEIGHT,
  TAB_BAR_MIN_SIDE_MARGIN,
  TAB_BAR_PADDING_X,
  TAB_BAR_PADDING_Y,
  TAB_BAR_WIDTH,
  TAB_CENTRE_SIZE,
  TAB_SIZE,
  tabActiveness,
  tabIndicatorOffsets,
  useTabBarBottomOffset,
} from '@/components/ui/tab-bar-layout';
import { haptics, springs, useMotion } from '@/lib/motion';

/**
 * Design V2 floating tab bar (S13-01 §8, Figma "tab bar" node 5:201) with the
 * S14-02 §2 motion.
 *
 * 350×60 pill, white @95%, 1pt ink @12% border, r30, shadow 0/12/40 ink @12%,
 * padding 7/17.6. Tabs are 44×44 r22, inactive = ink-variant icon. A single
 * navy circle slides between the tab positions (`gentle` spring); each icon
 * cross-colours to white as the circle passes under it (two icon layers
 * crossfaded by how close the circle is). Reduce Motion: the circle jumps.
 *
 * Community (centre) is always a raised 52×52 lilac circle with a plum-mid
 * icon and shadow 0/6/18 plum-mid @25%; when active its icon darkens to plum
 * and it gains a 2pt plum-mid ring. It lifts 2pt on press with a deeper
 * shadow (`snappy`). When Community is active the navy circle rests hidden
 * under it. `selection()` haptic on tab change only (never on re-tap).
 * Android: the same morph plus a bounded ripple on each hit target.
 */

const ICONS: Record<string, React.ComponentType<IconV2Props>> = {
  index: HomeV2,
  stables: HorseshoeV2,
  community: ChatV2,
  events: CalendarV2,
  paddock: StarV2,
};

const CENTRE_ROUTE = 'community';
const ICON_SIZE = 24;
/** Centre button lift on press (pt). */
const CENTRE_LIFT = -2;

const styles = StyleSheet.create({
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: TAB_BAR_BORDER,
    borderColor: colors.outlineVariant,
    backgroundColor: withAlpha(colors.white, 0.95),
    boxShadow: `0px 12px 40px ${withAlpha(colors.ink, 0.12)}`,
    paddingVertical: TAB_BAR_PADDING_Y,
    paddingHorizontal: TAB_BAR_PADDING_X,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: (TAB_BAR_HEIGHT - TAB_BAR_BORDER * 2 - TAB_SIZE) / 2,
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: TAB_SIZE / 2,
    backgroundColor: colors.primary,
  },
  tab: { width: TAB_SIZE, height: TAB_SIZE, borderRadius: TAB_SIZE / 2, overflow: 'hidden' },
  iconLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  centre: {
    width: TAB_CENTRE_SIZE,
    height: TAB_CENTRE_SIZE,
    borderRadius: TAB_CENTRE_SIZE / 2,
    backgroundColor: colors.primaryFixed,
    boxShadow: `0px 6px 18px ${withAlpha(colors.plumMid, 0.25)}`,
  },
  centreLiftShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_CENTRE_SIZE / 2,
    backgroundColor: colors.primaryFixed,
    boxShadow: `0px 10px 24px ${withAlpha(colors.plumMid, 0.4)}`,
  },
  centreActive: { borderWidth: 2, borderColor: colors.plumMid },
});

type TabButtonProps = {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
};

type RegularTabProps = TabButtonProps & {
  indicatorX: SharedValue<number>;
  slotX: number;
  spacing: number;
};

/** A regular tab: inactive and active icon layers, crossfaded by the circle's position. */
function RegularTab({ routeName, label, focused, onPress, onLongPress, testID, indicatorX, slotX, spacing }: RegularTabProps) {
  const Icon = ICONS[routeName] ?? HomeV2;
  const activeStyle = useAnimatedStyle(() => ({
    opacity: tabActiveness(indicatorX.get(), slotX, spacing),
  }));
  return (
    <MotionPressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={styles.tab}
    >
      <View pointerEvents="none" style={styles.iconLayer}>
        <Icon size={ICON_SIZE} color={colors.inkVariant} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.iconLayer, activeStyle]}>
        <Icon size={ICON_SIZE} color={colors.onPrimary} />
      </Animated.View>
    </MotionPressable>
  );
}

function useCentreLift() {
  const { reduceMotion } = useMotion();
  const lift = useSharedValue(0);
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.get() * CENTRE_LIFT }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: lift.get() }));
  const to = (value: number) => {
    lift.set(reduceMotion ? value : withSpring(value, springs.snappy));
  };
  return { liftStyle, shadowStyle, pressIn: () => to(1), pressOut: () => to(0) };
}

/** Community: the raised lilac circle. Lifts on press; its own Android ripple. */
function CentreTab({ routeName, label, focused, onPress, onLongPress, testID }: TabButtonProps) {
  const Icon = ICONS[routeName] ?? ChatV2;
  const { liftStyle, shadowStyle, pressIn, pressOut } = useCentreLift();
  return (
    <Animated.View style={liftStyle}>
      <Animated.View pointerEvents="none" style={[styles.centreLiftShadow, shadowStyle]} />
      <Pressable
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        android_ripple={Platform.OS === 'android' ? { color: RIPPLE_COLOR, borderless: true, radius: TAB_CENTRE_SIZE / 2 } : undefined}
        className="items-center justify-center"
        style={[styles.centre, focused && styles.centreActive]}
      >
        <Icon size={ICON_SIZE} color={focused ? colors.plum : colors.plumMid} />
      </Pressable>
    </Animated.View>
  );
}

/** Slot offsets for the current pill width, and the navy circle that slides between them. */
function useTabIndicator(routeNames: readonly string[], activeIndex: number, barWidth: number) {
  const { reduceMotion } = useMotion();
  const slotKey = routeNames.join('|');
  const offsets = React.useMemo(
    () => tabIndicatorOffsets(barWidth, slotKey.split('|').map(name => (name === CENTRE_ROUTE ? TAB_CENTRE_SIZE : TAB_SIZE))),
    [barWidth, slotKey],
  );
  const target = offsets[activeIndex] ?? offsets[0] ?? 0;
  const indicatorX = useSharedValue(target);
  const settled = React.useRef(target);

  React.useEffect(() => {
    if (settled.current === target)
      return;
    settled.current = target;
    indicatorX.set(reduceMotion ? target : withSpring(target, springs.gentle));
  }, [target, reduceMotion, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
  }));
  const spacing = offsets.length > 1 ? Math.abs(offsets[1] - offsets[0]) : TAB_SIZE;
  return { offsets, indicatorX, indicatorStyle, spacing };
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const bottomOffset = useTabBarBottomOffset();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(TAB_BAR_WIDTH, screenWidth - TAB_BAR_MIN_SIDE_MARGIN * 2);
  const indicator = useTabIndicator(state.routes.map(r => r.name), state.index, width);

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ bottom: bottomOffset }}
    >
      <View
        testID="tab-bar"
        accessibilityRole="tablist"
        className="flex-row items-center justify-between"
        style={[styles.bar, { width }]}
      >
        <Animated.View testID="tab-bar-indicator" pointerEvents="none" style={[styles.indicator, indicator.indicatorStyle]} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              haptics.selection();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const common = {
            routeName: route.name,
            label: options.tabBarAccessibilityLabel ?? options.title ?? route.name,
            focused: isFocused,
            onPress,
            onLongPress,
            testID: options.tabBarButtonTestID,
          };

          return route.name === CENTRE_ROUTE
            ? <CentreTab key={route.key} {...common} />
            : (
                <RegularTab
                  key={route.key}
                  {...common}
                  indicatorX={indicator.indicatorX}
                  slotX={indicator.offsets[index] ?? 0}
                  spacing={indicator.spacing}
                />
              );
        })}
      </View>
    </View>
  );
}
