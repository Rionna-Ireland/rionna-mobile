import type { ImageSourcePropType } from 'react-native';
import type { VideoSource } from './login-media';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { Image, StyleSheet } from 'react-native';

type Props = {
  source: VideoSource;
  poster: ImageSourcePropType;
};

/**
 * Login hero video (expo-video, S14-01). Muted, looping, autoplaying, no native
 * controls, cover-fit. The poster stays visible underneath until the first
 * frame renders, so there's never a black flash. Only `LoginMedia` mounts this,
 * and only when it's given a `videoSource`.
 */
export function LoginVideo({ source, poster }: Props) {
  const [firstFrame, setFirstFrame] = React.useState(false);
  const player = useVideoPlayer(source, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });

  return (
    <>
      <Image source={poster} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <VideoView
        testID="login-media-video"
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setFirstFrame(true)}
        style={[StyleSheet.absoluteFill, { opacity: firstFrame ? 1 : 0 }]}
      />
    </>
  );
}
