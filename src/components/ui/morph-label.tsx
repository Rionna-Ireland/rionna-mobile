import type { TextVariant } from './text-variants';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations, timings, useMotion } from '@/lib/motion';

import { Text } from './text';

export type MorphLabelProps = {
  text?: string;
  variant?: TextVariant;
  className?: string;
  testID?: string;
};

/**
 * Single-line label that crossfades when `text` changes (S14-02 §3, the RSVP
 * "label morph"): the old label fades out in place while the new one fades in,
 * over `quick`. Reduce Motion swaps instantly. The outgoing copy is hidden from
 * accessibility so screen readers (and tests) only ever see the current label.
 */
export function MorphLabel({ text, variant, className, testID }: MorphLabelProps) {
  const { reduceMotion } = useMotion();
  const [shown, setShown] = React.useState(text);
  const [outgoing, setOutgoing] = React.useState<string | undefined>(undefined);
  const progress = useSharedValue(1);

  // "Storing information from previous renders": capture the old label as it changes.
  if (shown !== text) {
    setShown(text);
    setOutgoing(reduceMotion ? undefined : shown);
  }

  React.useEffect(() => {
    if (outgoing === undefined)
      return;
    progress.set(0);
    progress.set(withTiming(1, timings.quick));
    const done = setTimeout(() => setOutgoing(undefined), durations.quick);
    return () => clearTimeout(done);
  }, [outgoing, progress]);

  const inStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const outStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));

  return (
    <View style={styles.incoming}>
      <Animated.View style={inStyle}>
        <Text variant={variant} testID={testID} className={className} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
      {outgoing !== undefined
        ? (
            <Animated.View
              pointerEvents="none"
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.outgoing, outStyle]}
            >
              <Text variant={variant} className={className} numberOfLines={1}>{outgoing}</Text>
            </Animated.View>
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  incoming: { flexShrink: 1 },
  outgoing: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
