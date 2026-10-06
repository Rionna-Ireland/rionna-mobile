import type { ImageSourcePropType } from 'react-native';
import type * as LoginVideoModule from './login-video';
import { requireOptionalNativeModule } from 'expo';
import * as React from 'react';
import { Image, StyleSheet } from 'react-native';

import { colors, View } from '@/components/ui';
import { PlayV2 } from '@/components/ui/icons/v2';

/**
 * `expo-video` is loaded only when a video is actually requested AND the native
 * module is in this binary. A static import would crash every route at startup
 * on a binary built without it (e.g. a 9.0.0 dev client against 9.1.0 JS).
 */
let cachedLoginVideo: typeof LoginVideoModule.LoginVideo | null | undefined;
function loadLoginVideo(): typeof LoginVideoModule.LoginVideo | null {
  if (cachedLoginVideo !== undefined)
    return cachedLoginVideo;
  try {
    cachedLoginVideo = requireOptionalNativeModule('ExpoVideo')
      ? (require('./login-video') as typeof LoginVideoModule).LoginVideo
      : null;
  }
  catch {
    cachedLoginVideo = null;
  }
  return cachedLoginVideo;
}

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
        ? <VideoOrPoster source={videoSource} poster={poster} />
        : <PosterWithPlay poster={poster} />}
    </View>
  );
}

/** The player when this binary has `expo-video`, otherwise the poster. */
function VideoOrPoster({ source, poster }: { source: VideoSource; poster: ImageSourcePropType }) {
  const video = loadLoginVideo();
  return video
    ? React.createElement(video, { source, poster })
    : <PosterWithPlay poster={poster} />;
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
