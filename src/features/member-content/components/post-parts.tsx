import type { AuthorRole } from '@/features/member-content/types';

import * as React from 'react';
import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { Avatar, MonoLabel, NumberRoll, Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ChatV2 } from '@/components/ui/icons/v2';
import { LikeToggle } from '@/features/member-content/components/like-toggle';
import { SPACE_TAG_CLASS, spaceTagTone } from '@/features/member-content/lib/space-tag';
import { useHorseSpaceIds } from '@/features/member-content/lib/use-horse-space-ids';

const ROLE_LABEL: Record<AuthorRole, string> = { trainer: 'Trainer', staff: 'Staff' };

/** Category-coloured space tag (horses sage, official navy, news ice, ...; see spaceTagTone). */
export function SpaceTag({ name, spaceId }: { name: string | null | undefined; spaceId?: string | null }) {
  const horseIds = useHorseSpaceIds();
  const label = name?.trim();
  if (!label) {
    return null;
  }
  const tone = SPACE_TAG_CLASS[spaceTagTone(label, spaceId, horseIds)];
  return (
    <View
      testID="space-tag"
      className={twMerge('shrink rounded-[5px] px-2.5 py-1.5', tone.container)}
    >
      <MonoLabel className={tone.text} numberOfLines={1}>{label}</MonoLabel>
    </View>
  );
}

/** Lilac-tint role badge. Renders only when the backend supplies `authorRole` (S13-11). */
export function RoleBadge({ role }: { role: AuthorRole | null | undefined }) {
  if (!role) {
    return null;
  }
  return (
    <View testID="role-badge" className="rounded-[5px] bg-white px-2.5 py-1.5">
      <MonoLabel>{ROLE_LABEL[role]}</MonoLabel>
    </View>
  );
}

export function AuthorHeader({
  name,
  avatarUrl,
  time,
  spaceName,
  spaceId,
  role,
  showSpaceTag = true,
}: {
  name: string | null;
  avatarUrl?: string | null;
  time: string | null;
  spaceName?: string | null;
  spaceId?: string | null;
  role?: AuthorRole | null;
  showSpaceTag?: boolean;
}) {
  const displayName = name?.trim() || 'Rionna member';
  return (
    <View className="flex-row items-center gap-2">
      <Avatar uri={avatarUrl} name={displayName} size={41} ring />
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="title" numberOfLines={1} className="shrink">{displayName}</Text>
          {showSpaceTag ? <SpaceTag name={spaceName} spaceId={spaceId} /> : null}
          <RoleBadge role={role} />
        </View>
        {time ? <Text variant="body-sm" className="text-label opacity-60">{time}</Text> : null}
      </View>
    </View>
  );
}

/** Heart (filled plum when liked) + comment count row; both counts roll (S14-02). */
export function ActivityRow({
  likeCount,
  commentCount,
  isLiked,
  onToggleLike,
  likePending = false,
  likeKey,
}: {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  onToggleLike?: () => void;
  likePending?: boolean;
  likeKey?: string;
}) {
  return (
    <View className="flex-row items-center gap-4">
      <LikeToggle
        testID={likeKey}
        likeCount={likeCount}
        isLiked={isLiked}
        onToggle={onToggleLike}
        pending={likePending}
      />
      <View
        accessible
        accessibilityLabel={`${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
        className="flex-row items-center gap-0.5"
      >
        <ChatV2 size={20} color={colors.label} strokeWidth={1.2} />
        <NumberRoll variant="body" className="text-label" value={commentCount} />
      </View>
    </View>
  );
}
