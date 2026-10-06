import type { MotionPressableProps } from './pressable';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { twMerge } from 'tailwind-merge';

import { timings, useMotion } from '@/lib/motion';

import colors from './colors';
import { minHitSlop } from './hit-slop';
import { NumberRoll } from './number-roll';
import { MotionPressable } from './pressable';
import { Text } from './text';

/**
 * Filter chip (Figma "Labels M", S13-01 §7): 32h r6, padding 7/12,
 * SemiBold 12 navy. Selected = lilac fill + hairline lilac-darker border;
 * unselected = white. Optional count badge 18h r9 (white on selected, cream
 * on unselected).
 *
 * Motion (S14-02 §1): presses with the small `MotionPressable` scale and a
 * `selection()` haptic; the lilac fill is a layer that crossfades in place over
 * `quick` (instant under Reduce Motion). The count rolls (`NumberRoll`).
 */
export type ChipProps = Omit<MotionPressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  count?: number;
  className?: string;
};

/** A leading emoji ("🐴 Stable Notes") and the rest of the label. */
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u;

/**
 * The label as one or two `Text`s. An emoji's taller line box shifts the
 * baseline of text in the same `Text` (A-046: "🐴 Stable Notes" sat ~2pt high
 * in the fixed 32pt chip), so a leading emoji gets its own `Text`, centred on
 * its own, and the words keep the same baseline as every other chip.
 */
function ChipLabel({ label }: { label: string }) {
  const match = LEADING_EMOJI.exec(label);
  if (!match || !match[2]) {
    return <Text variant="body-sm" className="font-sans-semibold" numberOfLines={1}>{label}</Text>;
  }
  return (
    <View className="shrink flex-row items-center">
      <Text variant="body-sm" className="font-sans-semibold">{`${match[1]} `}</Text>
      <Text variant="body-sm" className="shrink font-sans-semibold" numberOfLines={1}>{match[2]}</Text>
    </View>
  );
}

/** Opacity of the lilac fill layer: crossfades on `selected` changes. */
function useSelectedFill(selected: boolean) {
  const { reduceMotion } = useMotion();
  const fill = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    const target = selected ? 1 : 0;
    fill.set(reduceMotion ? target : withTiming(target, timings.quick));
  }, [selected, reduceMotion, fill]);
  return useAnimatedStyle(() => ({ opacity: fill.get() }));
}

export function Chip({ label, selected = false, count, className, testID, ...props }: ChipProps) {
  const a11yLabel = count !== undefined ? `${label}, ${count}` : label;
  const fillStyle = useSelectedFill(selected);
  return (
    <MotionPressable
      size="small"
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected }}
      hitSlop={minHitSlop(32)}
      testID={testID}
      className={twMerge('h-8 flex-row items-center gap-1.5 overflow-hidden rounded-md bg-white px-3', className)}
      {...props}
    >
      <Animated.View
        testID={testID ? `${testID}-fill` : undefined}
        pointerEvents="none"
        style={[styles.fill, fillStyle]}
      />
      <ChipLabel label={label} />
      {count !== undefined && (
        <View
          testID={testID ? `${testID}-count` : undefined}
          className={twMerge(
            'h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-1.5',
            selected ? 'bg-white' : 'bg-secondary-container',
          )}
        >
          <NumberRoll className="font-sans-semibold text-[10px]/[13px] text-ink" value={count} />
        </View>
      )}
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  // Selected: lilac fill + hairline lilac-darker border (r6 to match the chip).
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryFixed,
    borderColor: colors.onPrimaryContainer,
    borderWidth: 0.5,
    borderRadius: 6,
  },
});

export type ChipRowItem = { key: string; label: string; count?: number };

export type ChipRowProps = {
  items: ChipRowItem[];
  /** Key of the selected chip (single selection, e.g. Horse detail sections). */
  selectedKey?: string;
  onSelect?: (key: string) => void;
  /** Horizontal inset so the first chip lines up with the page gutter. */
  contentInset?: number;
  testID?: string;
};

/** Horizontally scrolling chip row with single selection. */
export function ChipRow({ items, selectedKey, onSelect, contentInset = 0, testID }: ChipRowProps) {
  return (
    <ScrollView
      horizontal
      testID={testID}
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: 8, paddingHorizontal: contentInset }}
    >
      {items.map(item => (
        <Chip
          key={item.key}
          testID={testID ? `${testID}-${item.key}` : undefined}
          label={item.label}
          count={item.count}
          selected={item.key === selectedKey}
          onPress={() => onSelect?.(item.key)}
        />
      ))}
    </ScrollView>
  );
}
