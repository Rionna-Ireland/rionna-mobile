import type * as ExpoAudioType from 'expo-audio';
import type { HorsePhoto } from '@/features/stables/types';

import * as React from 'react';
import { Pressable, Text, View } from '@/components/ui';

// Lazy-require so a dev client that hasn't been rebuilt with expo-audio
// linked doesn't crash the profile screen -- falls back to a "not
// available" note. Mirrors the expo-web-browser guard pattern in
// src/lib/open-external-link.ts / the settings profile screen.
let ExpoAudio: typeof ExpoAudioType | null = null;
try {
  ExpoAudio = require('expo-audio');
}
catch {
  ExpoAudio = null;
}

type AudioNotesProps = {
  notes: HorsePhoto[] | undefined;
};

function AudioNoteRow({ note, index }: { note: HorsePhoto; index: number }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const playerRef = React.useRef<InstanceType<typeof ExpoAudioType.AudioPlayer> | null>(null);

  React.useEffect(() => {
    // Release the native player when the row unmounts (screen navigated
    // away from while a note is loaded/playing).
    return () => {
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, []);

  const togglePlay = () => {
    if (!ExpoAudio) {
      return;
    }
    if (!playerRef.current) {
      const player = ExpoAudio.createAudioPlayer({ uri: note.url });
      player.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(status.playing);
        if (status.didJustFinish) {
          player.seekTo(0).catch(() => {});
        }
      });
      playerRef.current = player;
    }
    if (playerRef.current.playing) {
      playerRef.current.pause();
    }
    else {
      playerRef.current.play();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause audio note' : 'Play audio note'}
      testID={`audio-note-${index}`}
      onPress={togglePlay}
      className="flex-row items-center gap-3 border-b border-muted py-3 last:border-b-0 last:pb-0"
    >
      <View className="size-9 items-center justify-center rounded-full bg-primary">
        <Text className="text-on-primary">{isPlaying ? '⏸' : '▶'}</Text>
      </View>
      <Text className="flex-1 font-sans text-sm text-charcoal-800" numberOfLines={1}>
        {note.caption || `Audio note ${index + 1}`}
      </Text>
    </Pressable>
  );
}

/**
 * Simple play/pause list for admin-uploaded horse audio notes. Renders
 * nothing when there are none; if expo-audio isn't linked into the
 * current build (native module requiring a dev client rebuild), shows a
 * quiet fallback instead of crashing.
 */
export function AudioNotes({ notes }: AudioNotesProps) {
  const items = notes ?? [];

  if (items.length === 0) {
    return null;
  }

  return (
    <View className="rounded-2xl bg-card p-6">
      <Text className="mb-4 font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        Audio Notes
      </Text>
      {ExpoAudio
        ? (
            <View>
              {items.map((note, index) => (
                <AudioNoteRow key={note.url} note={note} index={index} />
              ))}
            </View>
          )
        : (
            <Text className="font-sans text-sm text-muted-foreground">
              Audio playback isn't available in this build yet.
            </Text>
          )}
    </View>
  );
}
