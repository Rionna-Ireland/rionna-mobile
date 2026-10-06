import type { TextStyle } from 'react-native';
import type { RollSegment } from './number-roll-diff';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations, timings, useMotion } from '@/lib/motion';

import { diffRoll, hasRoll, rollDirection } from './number-roll-diff';
import { Text } from './text';

type TextProps = Omit<React.ComponentProps<typeof Text>, 'children' | 'tx'>;

export type NumberRollProps = TextProps & {
  /** A count (`37`) or a string with numbers in it (`"37 going"`, `"3 of 20"`). */
  value: number | string;
};

type Roll = { id: number; segments: RollSegment[]; dir: 1 | -1 };

const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Count that rolls when it changes (S14-02 §3): each changed digit slides
 * vertically, the old one out and the new one in (up when the number grows,
 * down when it shrinks) over `quick`; unchanged digits and surrounding text
 * stay put. Tabular figures keep columns steady. At rest (and under Reduce
 * Motion, or when the words around the number change) it's one plain `Text`.
 */
export function NumberRoll({ value, style, testID, ...textProps }: NumberRollProps) {
  const text = String(value);
  const { reduceMotion } = useMotion();
  const [shown, setShown] = React.useState(text);
  const [roll, setRoll] = React.useState<Roll | null>(null);

  // Capture the previous value as it changes ("storing info from previous renders").
  if (shown !== text) {
    setShown(text);
    const segments = reduceMotion ? null : diffRoll(shown, text);
    setRoll(hasRoll(segments) ? { id: (roll?.id ?? 0) + 1, segments, dir: rollDirection(shown, text) } : null);
  }

  React.useEffect(() => {
    if (!roll)
      return;
    const done = setTimeout(() => setRoll(null), durations.quick);
    return () => clearTimeout(done);
  }, [roll]);

  const textStyle = [TABULAR, style];
  if (!roll) {
    return <Text {...textProps} testID={testID} style={textStyle}>{text}</Text>;
  }
  return (
    <View testID={testID} accessible accessibilityLabel={text} style={styles.row}>
      {roll.segments.map((seg, i) => {
        const key = `${roll.id}-${i}`;
        if (seg.kind === 'text' || seg.from === seg.to)
          return <Text key={key} {...textProps} style={textStyle}>{seg.kind === 'text' ? seg.text : seg.to}</Text>;
        return <RollingDigit key={key} from={seg.from} to={seg.to} dir={roll.dir} textProps={textProps} textStyle={textStyle} />;
      })}
    </View>
  );
}

type RollingDigitProps = {
  from: string;
  to: string;
  dir: 1 | -1;
  textProps: TextProps;
  textStyle: TextProps['style'];
};

/** One clipped digit column: `from` leaves, `to` arrives, over `quick`. */
function RollingDigit({ from, to, dir, textProps, textStyle }: RollingDigitProps) {
  const progress = useSharedValue(0);
  const height = useSharedValue(0);

  React.useEffect(() => {
    progress.set(withTiming(1, timings.quick));
  }, [progress]);

  const inStyle = useAnimatedStyle(() => ({
    opacity: to ? progress.get() : 0,
    transform: [{ translateY: dir * height.get() * (1 - progress.get()) }],
  }));
  const outStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ translateY: -dir * height.get() * progress.get() }],
  }));

  return (
    <View style={styles.column} onLayout={e => height.set(e.nativeEvent.layout.height)}>
      {/* In-flow digit sizes the column; a disappearing column keeps the old width until it ends. */}
      <Animated.View style={inStyle}>
        <Text {...textProps} style={textStyle}>{to || from}</Text>
      </Animated.View>
      {from
        ? (
            <Animated.View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[StyleSheet.absoluteFill, outStyle]}
            >
              <Text {...textProps} style={textStyle}>{from}</Text>
            </Animated.View>
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  column: { overflow: 'hidden' },
});
