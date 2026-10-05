import type { ImageSourcePropType } from 'react-native';
import * as React from 'react';
import { Image, StyleSheet } from 'react-native';

import { colors, View } from '@/components/ui';
import { PlayV2 } from '@/components/ui/icons/v2';

import { LoginVideo } from './login-video';

/** A remote URL / `{ uri }`, or a bundled `require('…mp4')` asset. */
export type VideoSource = string | number | { uri: string };

export type LoginMediaProps = {
  poster: ImageSourcePropType;
  /**
   * Absent in production until the real asset lands (poster + decorative play
   * button). When set, a muted looping `expo-video` player replaces them.
   */
  videoSource?: VideoSource;
};

/**
 * Login hero media, 326×183 r8 (Figma "Video Player"). Decorative: hidden from
 * a11y. Without a `videoSource` it's the poster + an inert play button, and the
 * video player is never mounted.
 */
export function LoginMedia({ poster, videoSource }: LoginMediaProps) {
  return (
    <View
      testID="login-media"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-[183px] w-[326px] items-center justify-center overflow-hidden rounded-lg bg-white/6"
    >
      {videoSource !== undefined
        ? <LoginVideo source={videoSource} poster={poster} />
        : <PosterWithPlay poster={poster} />}
    </View>
  );
}

function PosterWithPlay({ poster }: { poster: ImageSourcePropType }) {
  return (
    <>
      <Image source={poster} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <View
        testID="login-media-play"
        pointerEvents="none"
        className="size-8 items-center justify-center rounded-full bg-ice-light"
        style={{
          shadowColor: colors.navyDeep,
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <PlayV2 size={12} color={colors.ink} />
      </View>
    </>
  );
}
