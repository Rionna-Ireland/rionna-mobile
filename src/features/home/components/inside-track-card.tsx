import type { InsideTrackResult } from '@/features/member-content/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Card, IconButton, MonoLabel, Tag, Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { PlayV2 } from '@/components/ui/icons/v2';
import { isNewItem, pickInsideTrackTeaser } from '@/features/home/lib/card-helpers';
import { translate } from '@/lib/i18n';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';

const INSIDE_TRACK_HEIGHT = 183;
// Tom (2026-10-02): the card always uses the brand horseback photograph, not the
// item's own image, so the title sits on a known, scrim-tested background.
const INSIDE_TRACK_BACKGROUND = require('../../../../assets/inside-track-bg.jpg');

/** "4 min watch" (rounded up); `null` without a positive duration. */
export function minWatchLabel(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0)
    return null;
  const count = Math.ceil(seconds / 60);
  return translate(count === 1 ? 'home.insideTrack.minWatchOne' : 'home.insideTrack.minWatchOther', { count });
}

type InsideTrackCardProps = { data: InsideTrackResult | undefined; now: Date; entranceIndex: number };

/**
 * S13-03 §6: full-bleed photo card. "N min watch" shows only when the item
 * carries a video duration (S13-13). Background is the fixed brand horseback photo.
 */
export function InsideTrackCard({ data, now, entranceIndex }: InsideTrackCardProps) {
  const router = useRouter();
  const teaser = pickInsideTrackTeaser(data);
  // Fades up the first time it has something to show (S14-02 §6).
  const entering = useFirstLoadEntrance(Boolean(teaser))(entranceIndex);
  if (!teaser)
    return null;
  const watchLabel = minWatchLabel(teaser.videoDurationSeconds);

  const open = () => {
    if (teaser.spaceId)
      router.push(`/post/${encodeURIComponent(teaser.spaceId)}/${encodeURIComponent(teaser.id)}`);
    else
      router.push('/inside-track');
  };

  return (
    <EntranceItem entering={entering}>
      <Card
        testID="home-inside-track"
        accessibilityLabel={translate('home.insideTrack.a11y', { title: teaser.title })}
        onPress={open}
        variant="photo"
        image={INSIDE_TRACK_BACKGROUND}
        className="justify-between"
        style={{ height: INSIDE_TRACK_HEIGHT }}
      >
        <View className="gap-2.5 pr-20">
          <MonoLabel tone="white">{translate('home.insideTrack.kicker')}</MonoLabel>
          <Text variant="display-md" className="text-white" numberOfLines={2}>{teaser.title}</Text>
        </View>
        <View className="flex-row items-end justify-between">
          <IconButton variant="circle" accessibilityLabel={translate('home.insideTrack.play')} onPress={open} testID="home-inside-track-play">
            <PlayV2 size={12} color={colors.ink} />
          </IconButton>
          <View className="flex-row gap-1.5">
            {watchLabel ? <Tag variant="ice-outline" label={watchLabel} testID="home-inside-track-duration" /> : null}
            {isNewItem(teaser.createdAt, now) ? <Tag variant="ice" label={translate('home.insideTrack.new')} testID="home-inside-track-new" /> : null}
          </View>
        </View>
      </Card>
    </EntranceItem>
  );
}
