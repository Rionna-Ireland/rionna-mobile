import type { Horse } from '@/features/stables/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { Avatar, Card, EmptyState, MonoLabel, MotionPressable } from '@/components/ui';
import { HorsePhotoSource } from '@/features/hero-transition/horse-photo-source';
import { heroSourceKey } from '@/features/hero-transition/types';
import { useOpenHorse } from '@/features/hero-transition/use-open-horse';
import { avatarPhotoUri, heroPhotoUri } from '@/features/stables/lib/photo-uris';
import { translate } from '@/lib/i18n';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';

const AVATAR_SIZE = 41;

/**
 * A followed horse's avatar. With a photo it's a hero-transition source
 * (S14-05): the 41pt circle expands into the detail hero. Without one it's
 * the plain pattern avatar and the detail opens with the default push.
 */
function HorseAvatar({ horse }: { horse: Horse }) {
  const url = horse.photos[0]?.url;
  if (!url)
    return <Avatar kind="horse" size={AVATAR_SIZE} name={horse.name} uri={null} />;
  return (
    <HorsePhotoSource
      sourceKey={heroSourceKey('home', horse.id)}
      horseId={horse.id}
      horseName={horse.name}
      uri={avatarPhotoUri(url)}
      heroUri={heroPhotoUri(url)}
      radius={AVATAR_SIZE / 2}
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
    />
  );
}

type MyHorsesCardProps = { horses: Horse[] | undefined; isLoading: boolean; entranceIndex: number };

/** S13-03 §5: white card with a row of 41pt followed-horse avatars. */
export function MyHorsesCard({ horses, isLoading, entranceIndex }: MyHorsesCardProps) {
  const router = useRouter();
  const openHorse = useOpenHorse();

  // Don't flash the empty state before the first fetch settles.
  const settled = !(!horses && isLoading);
  // Fades up once the first fetch settles (S14-02 §6).
  const entering = useFirstLoadEntrance(settled)(entranceIndex);
  if (!settled)
    return null;

  if (!horses || horses.length === 0) {
    return (
      <EntranceItem entering={entering}>
        <EmptyState
          testID="home-my-horses-empty"
          kicker={translate('home.myHorses.kicker')}
          title={translate('home.myHorses.emptyTitle')}
          actionLabel={translate('home.myHorses.emptyAction')}
          onAction={() => router.push('/stables')}
        />
      </EntranceItem>
    );
  }

  return (
    <EntranceItem entering={entering}>
      <Card testID="home-my-horses" className="gap-2.5">
        <MonoLabel>{translate('home.myHorses.kicker')}</MonoLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9 }}
        >
          {horses.map(horse => (
            <MotionPressable
              size="small"
              key={horse.id}
              testID={`home-horse-${horse.id}`}
              accessibilityRole="button"
              accessibilityLabel={horse.name}
              onPress={() => openHorse(horse.id, heroSourceKey('home', horse.id))}
            >
              <HorseAvatar horse={horse} />
            </MotionPressable>
          ))}
        </ScrollView>
      </Card>
    </EntranceItem>
  );
}
