import type { SharedValue } from 'react-native-reanimated';
import type { Rect } from '@/features/hero-transition/hero-math';
import type { HeroReveal } from '@/features/hero-transition/types';
import type { Entry, HorseDetail } from '@/features/stables/types';

import * as React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  colors,
  Dots,
  getInitials,
  Gradient,
  MonoLabel,
  PhotoFallback,
  Tag,
  Text,
} from '@/components/ui';
import { CaretRightV2 } from '@/components/ui/icons/v2';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { heroScrollStyle, measuredRect } from '@/features/hero-transition/hero-math';
import { FollowToggle } from '@/features/stables/components/follow-toggle';
import { PhotoCarousel } from '@/features/stables/components/photo-carousel';
import { DeclaredPill, StatusPill } from '@/features/stables/components/status-pill';
import { formatDeclaredDate, getProfileLine, getTrainerLine } from '@/features/stables/lib/horse-facts';
import { tx } from '@/features/stables/lib/tx';
import { translate } from '@/lib/i18n';
import { heroTransition } from '@/lib/motion';

export type HorseHeroProps = {
  horse: HorseDetail;
  declaredEntry?: Entry;
  followPending?: boolean;
  onToggleFollow: (following: boolean) => void;
  onBack: () => void;
  onShare: () => void;
  /**
   * Render the back/share row inside the hero (default). Horse detail passes
   * `false` and pins its own `HorseDetailBar` over the hero instead (S14-02
   * §5); the row's 44pt stays as a spacer so the layout doesn't move.
   */
  navBar?: boolean;
  /**
   * S14-05: the screen's scroll offset (UI thread). The photo parallaxes at
   * 0.5× while scrolling up and stretches from its top edge on overscroll;
   * `motion: false` (Reduce Motion) holds it still.
   */
  scroll?: { y: SharedValue<number>; motion: boolean };
  /** S14-05: visibility while the hero transition's overlay stands in for the hero. */
  reveal?: HeroReveal;
  /** S14-05: the first photo has drawn (its URL), or failed (null). */
  onPhotoDisplayed?: (uri: string | null) => void;
  /** S14-05: window rect of the display name (where the overlay lands it). */
  onNameLayout?: (rect: Rect) => void;
  /** S14-05: the carousel page settled on `index`. */
  onPhotoIndexChange?: (index: number) => void;
};

const BACK_ICON_STYLE = { transform: [{ rotate: '180deg' }] };

/**
 * The photo layer, kept in its own view so S14-05 can attach the shared
 * element transition, parallax and stretch to it without touching the rest
 * of the hero. Several photos page inside it; none → navy pattern + initials.
 */
function HeroPhoto({ horse, onIndexChange, onPhotoDisplayed }: { horse: HorseDetail; onIndexChange: (index: number) => void; onPhotoDisplayed?: (uri: string | null) => void }) {
  return (
    <View testID="horse-hero-photo" style={StyleSheet.absoluteFill}>
      {horse.photos.length > 0
        ? <PhotoCarousel photos={horse.photos} onIndexChange={onIndexChange} onFirstPhotoDisplay={onPhotoDisplayed} />
        : (
            <View testID="horse-hero-fallback" style={StyleSheet.absoluteFill}>
              <PhotoFallback colourway="navy" tileSize={64} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
                <Text variant="display-xl" className="text-on-primary opacity-80">{getInitials(horse.name)}</Text>
              </View>
            </View>
          )}
    </View>
  );
}

/** The white back/share row at the top of the hero. */
function HeroNavRow({ horse, onBack, onShare }: Pick<HorseHeroProps, 'horse' | 'onBack' | 'onShare'>) {
  return (
    <View pointerEvents="box-none" className="h-11 flex-row items-center justify-between">
      <Pressable
        testID="horse-hero-back"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={translate('stables.detail.backA11y')}
        hitSlop={12}
        className="-ml-1 flex-row items-center gap-1.5"
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <CaretRightV2 size={18} color={colors.white} style={BACK_ICON_STYLE} />
        <Text variant="body-sm" className="text-white">{translate('stables.detail.back')}</Text>
      </Pressable>
      <Pressable
        testID="horse-hero-share"
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={tx('stables.detail.shareA11y', { name: horse.name })}
        hitSlop={12}
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <MonoLabel tone="white">{translate('stables.detail.share')}</MonoLabel>
      </Pressable>
    </View>
  );
}

/** 1 at rest; the shared value while a hero transition is in flight. */
function revealOpacity(value: SharedValue<number> | undefined): number {
  'worklet';
  return value ? value.get() : 1;
}

/**
 * The photo + scrim, clipped in a wrapper that's pinned to the window top and
 * stretched from its top edge on overscroll; the photo inside it drifts for
 * the parallax (S14-05 §5). The hero itself doesn't clip, so the stretch can
 * reach above it.
 */
function HeroPhotoLayer({ horse, scroll, heroHeight, onIndexChange, onPhotoDisplayed }: {
  horse: HorseDetail;
  scroll?: HorseHeroProps['scroll'];
  heroHeight: SharedValue<number>;
  onIndexChange: (index: number) => void;
  onPhotoDisplayed?: (uri: string | null) => void;
}) {
  const y = scroll?.y;
  const motion = scroll?.motion ?? false;
  const parallax = heroTransition.parallax;
  const wrapperStyle = useAnimatedStyle(() => {
    const frame = heroScrollStyle(y ? y.get() : 0, { heroHeight: heroHeight.get(), parallax, enabled: motion });
    return { transform: [{ translateY: frame.wrapperTranslateY }, { scale: frame.wrapperScale }] };
  });
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroScrollStyle(y ? y.get() : 0, { heroHeight: heroHeight.get(), parallax, enabled: motion }).photoTranslateY }],
  }));
  return (
    <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.photoClip, wrapperStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <HeroPhoto horse={horse} onIndexChange={onIndexChange} onPhotoDisplayed={onPhotoDisplayed} />
      </Animated.View>
      <Gradient variant="photo-scrim" pointerEvents="none" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Name (its own layer, so the transition can hand it over from the overlay), then the profile lines. */
function HeroTitle({ horse, reveal, onNameLayout }: Pick<HorseHeroProps, 'horse' | 'reveal' | 'onNameLayout'>) {
  const nameRef = React.useRef<View>(null);
  const nameStyle = useAnimatedStyle(() => ({ opacity: revealOpacity(reveal?.name) }));
  const detailsStyle = useAnimatedStyle(() => ({ opacity: revealOpacity(reveal?.details) }));
  const profileLine = getProfileLine(horse);
  const trainerLine = getTrainerLine(horse);
  const hasDetails = Boolean(profileLine || trainerLine || horse.inviteOnly);
  const handleNameLayout = () => {
    nameRef.current?.measureInWindow((...values) => {
      const rect = measuredRect(values);
      if (rect)
        onNameLayout?.(rect);
    });
  };

  return (
    <View pointerEvents="none" className="gap-2">
      <Animated.View style={nameStyle}>
        <View ref={nameRef} collapsable={false} onLayout={onNameLayout ? handleNameLayout : undefined}>
          <Text variant="display-lg" accessibilityRole="header" className="text-white">{horse.name}</Text>
        </View>
      </Animated.View>
      {hasDetails
        ? (
            <Animated.View style={detailsStyle}>
              <View className="gap-2">
                {profileLine
                  ? <Text testID="horse-hero-profile-line" variant="body" className="text-white">{profileLine}</Text>
                  : null}
                {trainerLine
                  ? <Text testID="horse-hero-trainer" variant="body" className="text-white">{trainerLine}</Text>
                  : null}
                {horse.inviteOnly
                  ? <Tag variant="ice" label={translate('stables.card.private')} className="mt-1" />
                  : null}
              </View>
            </Animated.View>
          )
        : null}
    </View>
  );
}

/**
 * Horse detail hero (S13-04 detail §1, Figma frame 7): full-bleed photo
 * under a light status bar with a navy scrim, white back/share bar, name,
 * ⏳profile line, trainer(, ⏳location), then the Declared/status pill and
 * the Follow toggle. S14-05 animates it: parallax + overscroll stretch on
 * the photo layer, and `reveal` while the hero transition flies in.
 */
export function HorseHero(props: HorseHeroProps) {
  const { horse, declaredEntry, followPending = false, onToggleFollow, onBack, onShare, navBar = true, reveal } = props;
  const { width } = useWindowDimensions();
  const topPadding = useScreenTopPadding(4);
  const [photoIndex, setPhotoIndex] = React.useState(0);
  const heroHeight = useSharedValue(0);
  const shownStyle = useAnimatedStyle(() => ({ opacity: revealOpacity(reveal?.shown) }));
  const detailsStyle = useAnimatedStyle(() => ({ opacity: revealOpacity(reveal?.details) }));
  const { onPhotoIndexChange } = props;
  const handleIndexChange = React.useCallback((index: number) => {
    setPhotoIndex(index);
    onPhotoIndexChange?.(index);
  }, [onPhotoIndexChange]);

  return (
    <Animated.View
      testID="horse-hero"
      style={[styles.hero, { minHeight: width }, shownStyle]}
      onLayout={e => heroHeight.set(e.nativeEvent.layout.height)}
    >
      <HeroPhotoLayer horse={horse} scroll={props.scroll} heroHeight={heroHeight} onIndexChange={handleIndexChange} onPhotoDisplayed={props.onPhotoDisplayed} />

      <View
        pointerEvents="box-none"
        style={{ paddingTop: topPadding, minHeight: width }}
        className="justify-between gap-8 px-4 pb-8"
      >
        {navBar ? <HeroNavRow horse={horse} onBack={onBack} onShare={onShare} /> : <View className="h-11" />}

        <View pointerEvents="box-none" className="gap-6">
          <HeroTitle horse={horse} reveal={reveal} onNameLayout={props.onNameLayout} />

          <Animated.View pointerEvents="box-none" style={detailsStyle}>
            <View pointerEvents="box-none" className="flex-row gap-1">
              {declaredEntry
                ? <DeclaredPill date={formatDeclaredDate(declaredEntry.race.postTime)} className="flex-1" />
                : <StatusPill status={horse.status} tone="hero" className="flex-1" />}
              <FollowToggle
                testID="horse-hero-follow"
                tone="hero"
                className="flex-1"
                isFollowing={horse.isFollowing}
                pending={followPending}
                onToggle={onToggleFollow}
                confirmBeforeUnfollow={horse.inviteOnly ? { horseName: horse.name } : undefined}
              />
            </View>
          </Animated.View>
        </View>
      </View>

      {horse.photos.length > 1
        ? (
            <Animated.View pointerEvents="none" style={[styles.dots, detailsStyle]}>
              <Dots testID="horse-hero-dots" count={horse.photos.length} index={photoIndex} />
            </Animated.View>
          )
        : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  hero: { backgroundColor: colors.primary },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
  // Stretch scales from the top edge; the clip moves with it so it can reach above the hero.
  photoClip: { overflow: 'hidden', transformOrigin: 'top' },
});
