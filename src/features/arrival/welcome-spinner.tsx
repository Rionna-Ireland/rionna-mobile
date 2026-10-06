import * as React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, View } from '@/components/ui';
import { timings } from '@/lib/motion';

const SIZE = 48;

/**
 * 48pt ring spinner: plum-mid arc on a lilac track (Figma "Loading"). Keeps
 * spinning under Reduce Motion: it's a functional loading indicator.
 */
export function WelcomeSpinner() {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.set(withRepeat(withTiming(360, timings.spin), -1, false));
  }, [rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    <View
      testID="welcome-spinner"
      accessibilityRole="progressbar"
      style={{ width: SIZE, height: SIZE }}
    >
      <View
        className="absolute inset-0 rounded-full"
        style={{ borderWidth: 4, borderColor: colors.onPrimaryContainer }}
      />
      <Animated.View
        className="absolute inset-0 rounded-full"
        style={[
          { borderWidth: 4, borderColor: 'transparent', borderTopColor: colors.plumMid },
          style,
        ]}
      />
    </View>
  );
}
