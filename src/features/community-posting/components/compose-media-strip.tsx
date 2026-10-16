import type { ComposeMediaItem } from '@/features/community-posting/lib/use-compose-media';

import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Image, MotionPressable, Text } from '@/components/ui';
import { translate } from '@/lib/i18n';

type ComposeMediaStripProps = {
  items: ComposeMediaItem[];
  canAdd: boolean;
  error: string | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function Thumb({ item, onRemove, onRetry }: { item: ComposeMediaItem; onRemove: () => void; onRetry: () => void }) {
  const { media, status, progress } = item;
  return (
    <View className="relative" testID={`compose-media-${item.id}`}>
      <View className="size-24 overflow-hidden rounded-lg bg-ink">
        {media.kind === 'image'
          ? <Image source={{ uri: media.uri }} className="size-24" />
          : (
              <View className="size-24 items-center justify-center">
                <Text variant="body" className="text-white">▶</Text>
                {media.duration
                  ? <Text variant="body-sm" className="absolute right-1 bottom-1 text-white">{formatDuration(media.duration)}</Text>
                  : null}
              </View>
            )}
        {status === 'uploading'
          ? (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <Text variant="body-sm" className="font-sans-semibold text-white">{`${Math.round(progress * 100)}%`}</Text>
              </View>
            )
          : null}
        {status === 'failed'
          ? (
              <MotionPressable
                size="small"
                testID={`compose-media-retry-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={translate('community.compose.uploadFailedRetry')}
                onPress={onRetry}
                className="absolute inset-0 items-center justify-center bg-black/60 p-1"
              >
                <Text variant="body-sm" className="text-center text-white">{translate('community.compose.uploadFailedRetry')}</Text>
              </MotionPressable>
            )
          : null}
      </View>
      <MotionPressable
        size="small"
        testID={`compose-media-remove-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={translate('community.compose.removeMedia')}
        onPress={onRemove}
        hitSlop={8}
        className="absolute -top-2 -right-2 size-6 items-center justify-center overflow-hidden rounded-full bg-primary"
      >
        <Text variant="body-sm" className="font-sans-semibold text-white">×</Text>
      </MotionPressable>
    </View>
  );
}

/** Horizontal strip of picked photos/videos with upload state, remove, retry and an "Add" tile. */
export function ComposeMediaStrip({ items, canAdd, error, onAdd, onRemove, onRetry }: ComposeMediaStripProps) {
  return (
    <View className="gap-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pt-2 pr-2">
        {items.map(item => (
          <Thumb key={item.id} item={item} onRemove={() => onRemove(item.id)} onRetry={() => onRetry(item.id)} />
        ))}
        {canAdd
          ? (
              <MotionPressable
                testID="compose-media-add"
                accessibilityRole="button"
                accessibilityLabel={translate('community.compose.addMedia')}
                onPress={onAdd}
                className="size-24 items-center justify-center rounded-lg border border-dashed border-ink-variant"
              >
                <Text variant="body-sm" className="text-ink-variant">{translate('community.compose.addMedia')}</Text>
              </MotionPressable>
            )
          : null}
      </ScrollView>
      {error
        ? <Text variant="body-sm" className="text-plum">{error}</Text>
        : null}
    </View>
  );
}
