/* eslint-disable react-refresh/only-export-components */
import type { SharedValue } from 'react-native-reanimated';

import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { colors, MonoLabel, Text } from '@/components/ui';
import { CaretRightV2 } from '@/components/ui/icons/v2';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { CompactHeaderBar } from '@/components/ui/scroll-header';
import { COMPACT_BAR_HEIGHT } from '@/components/ui/scroll-header-math';
import { tx } from '@/features/stables/lib/tx';
import { translate } from '@/lib/i18n';

const BACK_ICON_STYLE = { transform: [{ rotate: '180deg' }] };

/** Same row offset as the hero's own (hidden) back/share row. */
export function useHorseDetailBarMetrics() {
  const top = useScreenTopPadding(4);
  return { top, height: top + COMPACT_BAR_HEIGHT };
}

/** White layer in flow, ink layer stacked on top; `progress` crossfades them. */
function Crossfade({ progress, white, ink, testID }: { progress: SharedValue<number>; white: React.ReactNode; ink: React.ReactNode; testID: string }) {
  const whiteStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const inkStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <View>
      <Animated.View testID={`${testID}-white`} style={whiteStyle}>{white}</Animated.View>
      <Animated.View testID={`${testID}-ink`} pointerEvents="none" style={[StyleSheet.absoluteFill, inkStyle]}>{ink}</Animated.View>
    </View>
  );
}

function BackLabel({ color }: { color: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <CaretRightV2 size={18} color={color} style={BACK_ICON_STYLE} />
      <Text variant="body-sm" style={{ color }}>{translate('stables.detail.back')}</Text>
    </View>
  );
}

type HorseDetailBarProps = {
  horseName: string;
  /** 0 while the photo is under the bar, 1 once the hero has scrolled under it. */
  progress: SharedValue<number>;
  onBack: () => void;
  /** Omit to hide Share (the loading skeleton has no horse to share yet). */
  onShare?: () => void;
};

/**
 * Horse detail's pinned back/share bar (S14-02 §5). White over the photo;
 * as the hero scrolls under the bar the icons cross to ink while the
 * `surface` @90% fill and hairline fade in. Lives outside `HorseHero`, which
 * stays isolated for S14-05's parallax and shared-element work.
 */
export function HorseDetailBar({ horseName, progress, onBack, onShare }: HorseDetailBarProps) {
  const { top } = useHorseDetailBarMetrics();
  return (
    <CompactHeaderBar progress={progress} topInset={top} testID="horse-detail-bar">
      <View pointerEvents="box-none" className="h-11 flex-row items-center justify-between">
        <Pressable
          testID="horse-hero-back"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={translate('stables.detail.backA11y')}
          hitSlop={12}
          className="-ml-1"
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <Crossfade testID="horse-detail-bar-back" progress={progress} white={<BackLabel color={colors.white} />} ink={<BackLabel color={colors.ink} />} />
        </Pressable>
        {onShare
          ? (
              <Pressable
                testID="horse-hero-share"
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel={tx('stables.detail.shareA11y', { name: horseName })}
                hitSlop={12}
                style={({ pressed }) => (pressed ? styles.pressed : null)}
              >
                <Crossfade
                  testID="horse-detail-bar-share"
                  progress={progress}
                  white={<MonoLabel tone="white">{translate('stables.detail.share')}</MonoLabel>}
                  ink={<MonoLabel className="text-ink">{translate('stables.detail.share')}</MonoLabel>}
                />
              </Pressable>
            )
          : null}
      </View>
    </CompactHeaderBar>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
});
