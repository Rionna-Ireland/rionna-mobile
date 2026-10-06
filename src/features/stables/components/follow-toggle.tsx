import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { twMerge } from 'tailwind-merge';

import { colors, minHitSlop, MotionPressable, Text } from '@/components/ui';
import { pressFollowToggle } from '@/features/stables/lib/follow-press';
import { translate } from '@/lib/i18n';
import { timings, useMotion } from '@/lib/motion';

type FollowToggleProps = {
  isFollowing: boolean;
  pending?: boolean;
  onToggle: (following: boolean) => void;
  /**
   * `card` (Stables list): `secondary` "Follow" / `primary` "Following".
   * `hero` (Horse detail photo): white-outline "Follow" / ice-filled "Following".
   */
  tone?: 'card' | 'hero';
  /**
   * When set, unfollowing (isFollowing -> false) confirms via Alert.alert
   * first instead of calling onToggle directly -- for invite-only horses
   * (S9-05), where unfollowing loses access and only a club admin can add
   * the member back. Following always happens directly, regardless.
   */
  confirmBeforeUnfollow?: { horseName: string };
  className?: string;
  testID?: string;
};

type Look = { fill: string; border: string; label: string };

/** Fill/border/label colours per tone and state (Figma frames 6 and 7). */
const LOOKS: Record<'card' | 'hero', { off: Look; on: Look }> = {
  card: {
    off: { fill: colors.white, border: colors.primary, label: 'text-ink' },
    on: { fill: colors.primary, border: colors.primary, label: 'text-on-primary' },
  },
  hero: {
    off: { fill: 'transparent', border: colors.white, label: 'text-white' },
    on: { fill: colors.ice, border: colors.ice, label: 'text-ink' },
  },
};

/** 0 = Follow, 1 = Following: crossfades over `base` (`quick` under Reduce Motion). */
function useFollowingProgress(isFollowing: boolean) {
  const { reduceMotion } = useMotion();
  const progress = useSharedValue(isFollowing ? 1 : 0);
  React.useEffect(() => {
    progress.set(withTiming(isFollowing ? 1 : 0, reduceMotion ? timings.reducedFade : timings.crossfade));
  }, [isFollowing, reduceMotion, progress]);
  const onStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  return { onStyle, offStyle };
}

/** The inactive label stays laid out (stable width) but hidden from accessibility. */
function hiddenIf(hidden: boolean) {
  return hidden
    ? { 'aria-hidden': true, 'accessibilityElementsHidden': true, 'importantForAccessibility': 'no-hide-descendants' as const }
    : {};
}

/**
 * Follow / Following button (S13-04, S14-02 §3). The mutation is optimistic,
 * so the state flips immediately: fill and label crossfade over `base`, and
 * becoming Following plays `success()`. While it's in flight presses are
 * ignored rather than dimming the button.
 */
export function FollowToggle({
  isFollowing,
  pending = false,
  onToggle,
  tone = 'card',
  confirmBeforeUnfollow,
  className,
  testID,
}: FollowToggleProps) {
  const { onStyle, offStyle } = useFollowingProgress(isFollowing);
  const handlePress = () => pressFollowToggle({ isFollowing, pending, onToggle, confirmBeforeUnfollow });

  const look = LOOKS[tone];
  return (
    <MotionPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={translate(isFollowing ? 'stables.follow.unfollowA11y' : 'stables.follow.followA11y')}
      accessibilityState={{ selected: isFollowing, busy: pending }}
      hitSlop={minHitSlop(HEIGHT)}
      onPress={handlePress}
      className={twMerge('h-[30px] items-center justify-center overflow-hidden rounded-md px-4', className)}
    >
      <Animated.View pointerEvents="none" style={[styles.layer, { backgroundColor: look.off.fill, borderColor: look.off.border }, offStyle]} />
      <Animated.View pointerEvents="none" style={[styles.layer, { backgroundColor: look.on.fill, borderColor: look.on.border }, onStyle]} />
      <Animated.View style={onStyle} {...hiddenIf(!isFollowing)}>
        <Text variant="body-sm" className={twMerge('font-sans-semibold', look.on.label)} numberOfLines={1}>
          {translate('stables.follow.following')}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.offLabel, offStyle]} {...hiddenIf(isFollowing)}>
        <Text variant="body-sm" className={twMerge('font-sans-semibold', look.off.label)} numberOfLines={1}>
          {translate('stables.follow.follow')}
        </Text>
      </Animated.View>
    </MotionPressable>
  );
}

const HEIGHT = 30;

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderRadius: 6 },
  offLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
