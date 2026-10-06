import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { NumberRoll } from '@/components/ui';
import colors from '@/components/ui/colors';
import { Heart } from '@/components/ui/icons';
import { likeCountLabel } from '@/features/member-content/lib/post-labels';
import { translate } from '@/lib/i18n';
import { haptics, popScale, springs, timings, useMotion } from '@/lib/motion';

const HEART = 20;

/**
 * Outline heart with a filled plum heart layered on top; the filled layer
 * crossfades with `isLiked` over `quick` (instant under Reduce Motion).
 */
function AnimatedHeart({ isLiked, popStyle }: { isLiked: boolean; popStyle?: object }) {
  const { reduceMotion } = useMotion();
  const fill = useSharedValue(isLiked ? 1 : 0);
  React.useEffect(() => {
    const target = isLiked ? 1 : 0;
    fill.set(reduceMotion ? target : withTiming(target, timings.quick));
  }, [isLiked, reduceMotion, fill]);
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.get() }));
  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - fill.get() }));

  return (
    <Animated.View style={[styles.heart, popStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, outlineStyle]}>
        <Heart width={HEART} height={HEART} color={colors.label} />
      </Animated.View>
      <Animated.View testID="like-heart-fill" style={[StyleSheet.absoluteFill, fillStyle]}>
        <Heart width={HEART} height={HEART} filled color={colors.plum} />
      </Animated.View>
    </Animated.View>
  );
}

type LikeToggleProps = {
  likeCount: number;
  isLiked: boolean;
  /** Omit for a read-only heart + count. */
  onToggle?: () => void;
  pending?: boolean;
  testID?: string;
};

/**
 * Like heart + rolling count (S14-02 §3). Liking pops the heart from
 * `popScale` back to 1 on the `snappy` spring with a `tap()` haptic; the fill
 * crossfades either way. Reduce Motion drops the pop (the haptic stays).
 */
export function LikeToggle({ likeCount, isLiked, onToggle, pending = false, testID }: LikeToggleProps) {
  const { reduceMotion } = useMotion();
  const scale = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePress = () => {
    if (!isLiked) {
      haptics.tap();
      if (!reduceMotion) {
        scale.set(popScale);
        scale.set(withSpring(1, springs.snappy));
      }
    }
    onToggle?.();
  };

  const content = (
    <>
      <AnimatedHeart isLiked={isLiked} popStyle={popStyle} />
      <NumberRoll variant="body" className={isLiked ? 'text-plum' : 'text-label'} value={likeCount} />
    </>
  );

  if (!onToggle) {
    return (
      <View
        accessible
        accessibilityLabel={likeCountLabel(likeCount)}
        className="flex-row items-center gap-0.5"
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={translate(isLiked ? 'community.like.liked' : 'community.like.like')}
      accessibilityValue={{ text: likeCountLabel(likeCount) }}
      accessibilityState={{ selected: isLiked, disabled: pending }}
      disabled={pending}
      hitSlop={8}
      onPress={handlePress}
      className="flex-row items-center gap-0.5"
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heart: { width: HEART, height: HEART },
});
