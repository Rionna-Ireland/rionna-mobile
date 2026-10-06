import type { LayoutChangeEvent, TextInputProps, TextStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { CountUpSlot } from './count-up-format';
import type { TextVariant } from './text-variants';
import * as React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { countUpSlots, EURO_SIGN, formatEuroWhole, groupWhole, slotChar } from './count-up-format';
import { Text } from './text';
import { TEXT_VARIANTS, textVariantStyle } from './text-variants';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** `font-display` (global.css `--font-display`): TextInput can't take the variant's class. */
const DISPLAY_FAMILY = 'PPEiko';

/**
 * PP Eiko has no tabular figures (no `tnum` feature; its digits run 388–646
 * units wide), so every digit sits in a fixed-width cell sized to the widest
 * digit ("4"), measured in the real font at the real size.
 */
const WIDEST_DIGIT = '4';

type Metrics = { digit: number; comma: number; sign: number; height: number };

function estimate(variant: TextVariant): Metrics {
  const { fontSize, lineHeight } = TEXT_VARIANTS[variant];
  return { digit: fontSize * 0.66, comma: fontSize * 0.24, sign: fontSize * 0.8, height: lineHeight };
}

export type CountUpProps = {
  /** The animated count, in whole euros (driven on the UI thread). */
  value: SharedValue<number>;
  /** Where `value` starts (renders before the first frame). */
  from: number;
  /** The final total in euros: sets the slots and the accessibility label. */
  target: number;
  color: string;
  variant?: TextVariant;
  testID?: string;
};

/**
 * Euro count-up (S14-06 §1). Each character is a non-editable
 * `AnimatedTextInput` whose `text` prop is derived from `value` on the UI
 * thread, so counting never re-renders React. Digits sit in fixed-width cells
 * (no jitter); cells left of the current number collapse, so "€500" never
 * shows the target's empty thousands. Read by screen readers as one label.
 */
export function CountUp({ value, from, target, color, variant = 'display-xl', testID }: CountUpProps) {
  const [metrics, setMetrics] = React.useState(() => estimate(variant));
  const body = useDerivedValue(() => groupWhole(value.get()));
  const slots = React.useMemo(() => countUpSlots(target), [target]);
  const fromBody = groupWhole(from);

  // Size and tracking only: single-line TextInputs misplace text with a
  // lineHeight, so each cell takes the measured Text height and centres.
  const inputStyle = React.useMemo<TextStyle>(() => {
    const { fontSize, letterSpacing } = textVariantStyle(variant);
    return { ...styles.input, fontSize, letterSpacing, fontFamily: DISPLAY_FAMILY, color, height: metrics.height };
  }, [variant, color, metrics.height]);
  const maxFontSizeMultiplier = TEXT_VARIANTS[variant].maxFontSizeMultiplier;

  const measure = (key: 'digit' | 'comma' | 'sign') => (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMetrics(prev => (prev[key] === width && prev.height === height ? prev : { ...prev, [key]: width, height }));
  };

  return (
    <View testID={testID} accessible accessibilityRole="text" accessibilityLabel={formatEuroWhole(target)} style={styles.row}>
      <Measurers variant={variant} onDigit={measure('digit')} onComma={measure('comma')} onSign={measure('sign')} />
      <TextInput
        {...INERT}
        value={EURO_SIGN}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[inputStyle, { width: metrics.sign }]}
      />
      {slots.map(slot => (
        <CountUpCell
          key={slot.k}
          slot={slot}
          body={body}
          initial={slotChar(fromBody, slot.k)}
          width={slot.kind === 'digit' ? metrics.digit : metrics.comma}
          style={inputStyle}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        />
      ))}
    </View>
  );
}

/** Props shared by every cell: display-only, invisible to touch and screen readers. */
const INERT: TextInputProps = {
  editable: false,
  caretHidden: true,
  contextMenuHidden: true,
  scrollEnabled: false,
  multiline: false,
  pointerEvents: 'none',
  underlineColorAndroid: 'transparent',
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no',
};

type CellProps = {
  slot: CountUpSlot;
  body: SharedValue<string>;
  initial: string;
  width: number;
  style: TextStyle;
  maxFontSizeMultiplier: number;
};

function CountUpCell({ slot, body, initial, width, style, maxFontSizeMultiplier }: CellProps) {
  const { k } = slot;
  const animatedProps = useAnimatedProps(() => ({ text: slotChar(body.get(), k) }) as TextInputProps);
  const cellStyle = useAnimatedStyle(() => ({ width: body.get().length > k ? width : 0 }));
  return (
    <AnimatedTextInput
      {...INERT}
      defaultValue={initial}
      animatedProps={animatedProps}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[style, cellStyle]}
    />
  );
}

type MeasurersProps = {
  variant: TextVariant;
  onDigit: (e: LayoutChangeEvent) => void;
  onComma: (e: LayoutChangeEvent) => void;
  onSign: (e: LayoutChangeEvent) => void;
};

/** Invisible glyphs in the real font/size (incl. Dynamic Type) that size the cells. */
function Measurers({ variant, onDigit, onComma, onSign }: MeasurersProps) {
  return (
    <View style={styles.measurers} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text variant={variant} onLayout={onDigit}>{WIDEST_DIGIT}</Text>
      <Text variant={variant} onLayout={onComma}>,</Text>
      <Text variant={variant} onLayout={onSign}>{EURO_SIGN}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  input: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  measurers: { position: 'absolute', opacity: 0, flexDirection: 'row', alignItems: 'flex-start' },
});
