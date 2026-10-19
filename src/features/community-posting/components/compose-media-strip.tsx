import type { ComposeMediaItem } from '@/features/community-posting/lib/use-compose-media';

import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Button, colors, IconButton, Image, MonoLabel, MotionPressable, ProgressBar, Text } from '@/components/ui';
import { CloseV2, PlayV2 } from '@/components/ui/icons/v2';
import { MAX_IMAGES, MAX_VIDEOS } from '@/features/community-posting/lib/limits';
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
    <View className="size-28 overflow-hidden rounded-lg bg-secondary-container" testID={`compose-media-${item.id}`}>
      {media.kind === 'image'
        ? <Image source={{ uri: media.uri }} className="size-28" />
        : (
            <View className="size-28 items-center justify-center bg-ink">
              <PlayV2 color={colors.white} size={28} />
              {media.duration
                ? <MonoLabel tone="white" className="absolute bottom-2 left-2">{formatDuration(media.duration)}</MonoLabel>
                : null}
            </View>
          )}
      {status === 'uploading'
        ? (
            <View className="absolute inset-x-0 bottom-0 bg-ink/40 p-2">
              <ProgressBar
                value={progress * 100}
                tone="on-plum"
                height={4}
                accessibilityLabel={translate('community.compose.uploading')}
              />
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
              className="absolute inset-0 items-center justify-center bg-plum/80"
            >
              <MonoLabel tone="white">{translate('community.compose.retry')}</MonoLabel>
            </MotionPressable>
          )
        : null}
      <IconButton
        variant="circle"
        testID={`compose-media-remove-${item.id}`}
        accessibilityLabel={translate('community.compose.removeMedia')}
        onPress={onRemove}
        className="absolute top-1.5 right-1.5"
      >
        <CloseV2 size={16} strokeWidth={2} />
      </IconButton>
    </View>
  );
}

/** Composer photos/video: labelled thumbnail row with upload progress, retry and remove, then the add button. */
export function ComposeMediaStrip({ items, canAdd, error, onAdd, onRemove, onRetry }: ComposeMediaStripProps) {
  return (
    <View className="gap-3">
      {items.length > 0
        ? (
            <>
              <View className="flex-row justify-between">
                <MonoLabel>{translate('community.compose.mediaLabel')}</MonoLabel>
                <MonoLabel>{`${items.length}/${MAX_IMAGES + MAX_VIDEOS}`}</MonoLabel>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
                {items.map(item => (
                  <Thumb key={item.id} item={item} onRemove={() => onRemove(item.id)} onRetry={() => onRetry(item.id)} />
                ))}
              </ScrollView>
            </>
          )
        : null}
      {canAdd
        ? (
            <View className="self-start">
              <Button
                testID="compose-media-add"
                variant="secondary"
                size="md"
                fullWidth={false}
                label={translate(items.length > 0 ? 'community.compose.addMore' : 'community.compose.addMedia')}
                onPress={onAdd}
              />
            </View>
          )
        : null}
      {error
        ? <Text variant="body-sm" className="text-plum">{error}</Text>
        : null}
    </View>
  );
}
