import type { SharedValue } from 'react-native-reanimated';
import type { FlightValues } from './flight-ops';
import type { Flight, FlightGeometry } from './types';

import { Image as ExpoImage } from 'expo-image';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Gradient, Text } from '@/components/ui';
import { ENTRANCE_RISE, heroTransition } from '@/lib/motion';

import {
  clamp,
  endNameOpacity,
  frameCheck,
  hasArea,
  innerImageTransform,
  lerp,
  lerpRect,
  startNameOpacity,
} from './hero-math';

/**
 * The flying photo (S14-05 §2): a clip container whose rect and corner radius
 * blend from one end to the other, holding the photo at a fixed aspect that
 * is only translated and scaled (so the crop morphs smoothly), with the
 * hero's scrim fading in over it and the name crossfading from the card's
 * `display-sm` to the hero's `display-lg`. Everything runs on the UI thread
 * from `values.progress`; React only mounts it and hears back when the first
 * photo frame is drawn and if frames drop.
 */

type OverlayProps = {
  flight: Flight;
  values: FlightValues;
  onImageDrawn: (id: number) => void;
  onFramesDropped: (id: number) => void;
};

/** 0 at the source end, 1 at the detail end, whichever way the flight runs. */
function detailProgress(p: number, reverse: boolean): number {
  'worklet';
  return reverse ? 1 - p : p;
}

/** Watches the first frames of the flight; all dropped → abort to a crossfade. */
function useFrameDropAbort(flightId: number, watching: SharedValue<boolean>, onFramesDropped: (id: number) => void) {
  const intervals = useSharedValue<number[]>([]);
  const frames = heroTransition.dropCheckFrames;
  const dropped = heroTransition.droppedFrameMs;
  useFrameCallback((frame) => {
    'worklet';
    if (!watching.get())
      return;
    const since = frame.timeSincePreviousFrame;
    if (since === null)
      return;
    const next = [...intervals.get(), since];
    intervals.set(next);
    const verdict = frameCheck(next, frames, dropped);
    if (verdict === 'watching')
      return;
    watching.set(false);
    if (verdict === 'abort')
      scheduleOnRN(onFramesDropped, flightId);
  });
}

function usePhotoStyles(values: FlightValues, flight: Flight) {
  const reverse = flight.direction === 'reverse';
  const base = flight.imageBase;
  const { progress, geometry, opacity } = values;
  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const clipStyle = useAnimatedStyle(() => {
    const g = geometry.get();
    const p = progress.get();
    const clip = lerpRect(g.fromClip, g.toClip, p);
    return {
      left: clip.x,
      top: clip.y,
      width: Math.max(0, clip.width),
      height: Math.max(0, clip.height),
      borderRadius: Math.max(0, lerp(g.fromRadius, g.toRadius, p)),
    };
  });
  const imageStyle = useAnimatedStyle(() => {
    const g = geometry.get();
    const p = progress.get();
    const t = innerImageTransform(lerpRect(g.fromImage, g.toImage, p), lerpRect(g.fromClip, g.toClip, p), base);
    return { transform: [{ translateX: t.translateX }, { translateY: t.translateY }, { scale: t.scale }] };
  });
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: clamp(detailProgress(progress.get(), reverse), 0, 1),
  }));
  return { rootStyle, clipStyle, imageStyle, scrimStyle };
}

/** Name layer positions: each moves between the two name rects; a missing end rises from below the other. */
function nameEnds(g: FlightGeometry): { card: { x: number; y: number }; hero: { x: number; y: number } } | null {
  'worklet';
  const card = hasArea(g.cardName) ? g.cardName : null;
  const hero = hasArea(g.heroName) ? g.heroName : null;
  if (!card && !hero)
    return null;
  return {
    card: card ?? { x: hero!.x, y: hero!.y + ENTRANCE_RISE },
    hero: hero ?? { x: card!.x, y: card!.y - ENTRANCE_RISE },
  };
}

function useNameStyles(values: FlightValues, reverse: boolean) {
  const { progress, geometry } = values;
  const cardStyle = useAnimatedStyle(() => {
    const g = geometry.get();
    const ends = nameEnds(g);
    if (!ends || !hasArea(g.cardName))
      return { opacity: 0 };
    const d = detailProgress(progress.get(), reverse);
    return {
      opacity: startNameOpacity(d),
      width: g.cardName.width,
      transform: [{ translateX: lerp(ends.card.x, ends.hero.x, d) }, { translateY: lerp(ends.card.y, ends.hero.y, d) }],
    };
  });
  const heroStyle = useAnimatedStyle(() => {
    const g = geometry.get();
    const ends = nameEnds(g);
    if (!ends || !hasArea(g.heroName))
      return { opacity: 0 };
    const d = detailProgress(progress.get(), reverse);
    return {
      opacity: endNameOpacity(d),
      width: g.heroName.width,
      transform: [{ translateX: lerp(ends.card.x, ends.hero.x, d) }, { translateY: lerp(ends.card.y, ends.hero.y, d) }],
    };
  });
  return { cardStyle, heroStyle };
}

function FlyingName({ name, values, reverse }: { name: string; values: FlightValues; reverse: boolean }) {
  const { cardStyle, heroStyle } = useNameStyles(values, reverse);
  return (
    <>
      <Animated.View style={[styles.name, cardStyle]}>
        <Text variant="display-sm" numberOfLines={2}>{name}</Text>
      </Animated.View>
      <Animated.View style={[styles.name, heroStyle]}>
        <Text variant="display-lg" className="text-white">{name}</Text>
      </Animated.View>
    </>
  );
}

export function HeroOverlay({ flight, values, onImageDrawn, onFramesDropped }: OverlayProps) {
  const { rootStyle, clipStyle, imageStyle, scrimStyle } = usePhotoStyles(values, flight);
  useFrameDropAbort(flight.id, values.watching, onFramesDropped);
  const recyclingKey = `hero-flight-${flight.id}`;
  const base = flight.imageBase;

  return (
    <Animated.View
      testID="hero-overlay"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, rootStyle]}
    >
      <Animated.View style={[styles.clip, clipStyle]}>
        <Animated.View style={[styles.image, { width: base.width, height: base.height }, imageStyle]}>
          <ExpoImage
            testID="hero-overlay-photo"
            source={{ uri: flight.baseUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={recyclingKey}
            priority="high"
            onDisplay={() => onImageDrawn(flight.id)}
          />
          {flight.topUri
            ? (
                <ExpoImage
                  source={{ uri: flight.topUri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={`${recyclingKey}-top`}
                  priority="high"
                />
              )
            : null}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Gradient variant="photo-scrim" style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
      {flight.name ? <FlyingName name={flight.name} values={values} reverse={flight.direction === 'reverse'} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
  image: { position: 'absolute', left: 0, top: 0 },
  name: { position: 'absolute', left: 0, top: 0 },
});
