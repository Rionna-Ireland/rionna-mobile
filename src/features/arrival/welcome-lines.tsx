import * as React from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import { arrival, springs, timings, useMotion } from '@/lib/motion';

import { firstName } from './welcome-name';

function Line({ index, children }: { index: number; children: React.ReactNode }) {
  const { reduceMotion } = useMotion();
  const opacity = useSharedValue(0);
  const rise = useSharedValue(reduceMotion ? 0 : arrival.welcomeRise);
  React.useEffect(() => {
    if (reduceMotion) {
      opacity.set(withTiming(1, timings.reducedFade));
      return;
    }
    const delay = index * arrival.welcomeLineStepMs;
    opacity.set(withDelay(delay, withSpring(1, springs.gentle)));
    rise.set(withDelay(delay, withSpring(0, springs.gentle)));
  }, [index, opacity, reduceMotion, rise]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: rise.get() }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Frame 4 (S14-04 §6): "Welcome" then the member's first name in lilac, each
 * line rising 8pt as it fades in, 120ms apart (`gentle`). Reduce Motion: a
 * plain fade, no rise.
 */
export function WelcomeLines({ name }: { name?: string | null }) {
  const first = firstName(name);
  return (
    <View testID="welcome-heading" accessible accessibilityRole="header" accessibilityLabel={first ? `Welcome ${first}` : 'Welcome'} className="items-center">
      <Line index={0}>
        <Text variant="display-xl" className="text-center">Welcome</Text>
      </Line>
      {first && (
        <Line index={1}>
          <Text variant="display-xl" testID="welcome-name" className="text-center text-on-primary-container">
            {first}
          </Text>
        </Line>
      )}
    </View>
  );
}
