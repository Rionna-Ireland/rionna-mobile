import type { ImageLoadEventData } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Rect } from './hero-math';
import type { HeroSource } from './types';

import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { getInitials, Image } from '@/components/ui';

import { measuredRect } from './hero-math';
import { useHeroApi } from './hero-transition-provider';

/** Host views can report where they are on screen. */
type Measurable = Pick<View, 'measureInWindow'>;

function measureRect(node: Measurable | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((...values) => resolve(measuredRect(values)));
  });
}

type HorsePhotoSourceProps = {
  /** Unique per surface + horse, e.g. `stables:<id>`. */
  sourceKey: string;
  horseId: string;
  horseName: string;
  /** What this surface draws (sized URL), or null for the pattern fallback. */
  uri: string | null;
  /** The same photo as the detail hero draws it. */
  heroUri: string | null;
  /** Corner radius (pt) of the photo box. */
  radius: number;
  /** The card's name label, so the overlay can lift the name off it. */
  nameRef?: React.RefObject<Measurable | null>;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A horse photo the hero can fly out of (S14-05 §1). Draws the photo (cover,
 * memory+disk cache, recycled by horse for FlashList), registers itself with
 * the hero controller, and hides while the overlay stands in for it. Without
 * a photo it's a plain pattern fallback and never flies.
 */
export function HorsePhotoSource({ sourceKey, horseId, horseName, uri, heroUri, radius, nameRef, className, style, testID }: HorsePhotoSourceProps) {
  const api = useHeroApi();
  const boxRef = React.useRef<View>(null);
  // Keyed by URL: a recycled cell (new horse / photo) never flies with the old photo's aspect.
  const aspectRef = React.useRef<{ uri: string; aspect: number } | null>(null);
  const hidden = useSharedValue(0);
  const photoStyle = useAnimatedStyle(() => ({ opacity: 1 - hidden.get() }));

  React.useEffect(() => {
    if (!api || !uri || !heroUri)
      return;
    const source: HeroSource = {
      key: sourceKey,
      horseId,
      name: horseName,
      uri,
      heroUri,
      radius,
      measure: () => measureRect(boxRef.current),
      measureName: nameRef ? () => measureRect(nameRef.current) : undefined,
      aspect: () => (aspectRef.current?.uri === uri ? aspectRef.current.aspect : null),
      hidden,
    };
    return api.registerSource(source);
  }, [api, sourceKey, horseId, horseName, uri, heroUri, radius, nameRef, hidden]);

  const handleLoad = React.useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source;
    aspectRef.current = uri && width > 0 && height > 0 ? { uri, aspect: width / height } : null;
  }, [uri]);

  return (
    <View ref={boxRef} collapsable={false} className={className} style={[{ borderRadius: radius }, styles.clip, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image
          testID={testID}
          source={uri ? { uri } : null}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={horseId}
          transition={0}
          onLoad={handleLoad}
          fallback={{ colourway: 'navy', initials: getInitials(horseName) }}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
