import type { Horse } from '@/features/stables/types';
import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { View } from 'react-native';

import { Card, Tag, Text } from '@/components/ui';
import { cardA11yActions, cardA11yLabel } from '@/components/ui/a11y-card';
import { HorsePhotoSource } from '@/features/hero-transition/horse-photo-source';
import { heroSourceKey } from '@/features/hero-transition/types';
import { FollowToggle } from '@/features/stables/components/follow-toggle';
import { DeclaredPill, EntryUpcomingPill, StatusPill } from '@/features/stables/components/status-pill';
import { pressFollowToggle } from '@/features/stables/lib/follow-press';
import {
  formatDeclaredDate,
  getDeclaredEntry,
  getProfileLine,
  getTrainerLine,
} from '@/features/stables/lib/horse-facts';
import { cardPhotoUri, heroPhotoUri } from '@/features/stables/lib/photo-uris';
import { tx } from '@/features/stables/lib/tx';
import { translate } from '@/lib/i18n';

const STATUS_LABEL: Record<Horse['status'], TxKeyPath> = {
  IN_TRAINING: 'stables.status.inTraining',
  PRE_TRAINING: 'stables.status.preTraining',
  REHAB: 'stables.status.rehab',
  RETIRED: 'stables.status.retired',
  SOLD: 'stables.status.sold',
};

/** `rounded-lg`: the photo's corner radius, which the hero transition morphs to 0. */
const CARD_PHOTO_RADIUS = 8;

type HorseCardProps = {
  horse: Horse;
  onPress: () => void;
  /** Omit to render the card read-only, without the Follow button. */
  onToggleFollow?: (horseId: string, following: boolean) => void;
  followPending?: boolean;
};

/**
 * One VoiceOver summary for the card (A-004), e.g. "Laska du Breuil, In
 * Training, following": the nested Follow button is hidden inside the card
 * element on iOS, so it's exposed as a custom action instead.
 */
function horseCardA11yLabel(horse: Horse, declaredDate: string | null, showFollow: boolean) {
  const pill = declaredDate
    ? tx('stables.declaredOn', { date: declaredDate })
    : horse.nextEntryId ? translate('stables.entryUpcoming') : translate(STATUS_LABEL[horse.status]);
  return cardA11yLabel([
    horse.name,
    getProfileLine(horse),
    getTrainerLine(horse),
    horse.inviteOnly && translate('stables.card.private'),
    pill,
    showFollow && horse.isFollowing && translate('stables.follow.followingA11y'),
  ]);
}

/**
 * Stables list card (S13-04 §3, Figma frame 6): white row card, 86×146
 * photo on the left, name / ⏳profile line / trainer on the right, then the
 * status (or Declared) pill and the Follow button along the bottom. The
 * photo is a hero-transition source (S14-05): `onPress` should open the
 * detail with `heroSourceKey('stables', horse.id)`.
 */
export function HorseCard({ horse, onPress, onToggleFollow, followPending = false }: HorseCardProps) {
  const photoUrl = horse.photos[0]?.url;
  const nameRef = React.useRef<View>(null);
  const profileLine = getProfileLine(horse);
  const trainerLine = getTrainerLine(horse);
  const declared = getDeclaredEntry(horse.entries);

  const follow = onToggleFollow
    ? (
        <FollowToggle
          testID={`horse-card-follow-${horse.id}`}
          className="flex-1"
          isFollowing={horse.isFollowing}
          pending={followPending}
          onToggle={following => onToggleFollow(horse.id, following)}
          confirmBeforeUnfollow={horse.inviteOnly ? { horseName: horse.name } : undefined}
        />
      )
    : null;

  return (
    <Card
      testID={`horse-card-${horse.id}`}
      onPress={onPress}
      accessibilityLabel={horseCardA11yLabel(horse, declared ? formatDeclaredDate(declared.race.postTime) : null, Boolean(onToggleFollow))}
      {...cardA11yActions([onToggleFollow && {
        name: 'follow',
        label: translate(horse.isFollowing ? 'stables.follow.unfollowA11y' : 'stables.follow.followA11y'),
        disabled: followPending,
        onActivate: () => pressFollowToggle({
          isFollowing: horse.isFollowing,
          pending: followPending,
          onToggle: following => onToggleFollow(horse.id, following),
          confirmBeforeUnfollow: horse.inviteOnly ? { horseName: horse.name } : undefined,
        }),
      }])}
      className="flex-row gap-4 border border-outline-variant"
    >
      <HorsePhotoSource
        testID="horse-card-photo"
        sourceKey={heroSourceKey('stables', horse.id)}
        horseId={horse.id}
        horseName={horse.name}
        uri={photoUrl ? cardPhotoUri(photoUrl) : null}
        heroUri={photoUrl ? heroPhotoUri(photoUrl) : null}
        radius={CARD_PHOTO_RADIUS}
        nameRef={nameRef}
        className="min-h-[146px] w-[86px]"
      />

      <View className="flex-1 justify-between gap-4">
        <View className="gap-2">
          <View ref={nameRef} collapsable={false}>
            <Text variant="display-sm" numberOfLines={2}>{horse.name}</Text>
          </View>
          {profileLine || trainerLine
            ? (
                <View className="gap-1">
                  {profileLine
                    ? <Text testID="horse-card-profile-line" variant="body-sm" className="text-ink-variant">{profileLine}</Text>
                    : null}
                  {trainerLine
                    ? <Text variant="body-sm" className="font-sans-semibold text-label">{trainerLine}</Text>
                    : null}
                </View>
              )
            : null}
          {horse.inviteOnly
            ? <Tag variant="ice" label={translate('stables.card.private')} testID="horse-card-private" />
            : null}
        </View>

        {declared || horse.nextEntryId
          ? (
              <View className="gap-1">
                {declared
                  ? <DeclaredPill date={formatDeclaredDate(declared.race.postTime)} />
                  : <EntryUpcomingPill />}
                {follow ? <View className="flex-row">{follow}</View> : null}
              </View>
            )
          : (
              <View className="flex-row gap-1">
                <StatusPill status={horse.status} className="flex-1" />
                {follow}
              </View>
            )}
      </View>
    </Card>
  );
}
