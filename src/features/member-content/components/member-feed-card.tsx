import type { MemberFeedItem } from '@/features/member-content/types';

import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Image } from '@/components/ui';
import { formatCount, formatMemberContentDate } from '@/features/member-content/lib/content-format';

type MemberFeedCardProps = {
  item: MemberFeedItem;
  onOpen: (spaceId: string, postId: string) => void;
};

function CardBody({ item }: { item: MemberFeedItem }) {
  const date = formatMemberContentDate(item.createdAt);
  const meta = [item.spaceName, date].filter(Boolean).join(' · ');

  return (
    <View className="overflow-hidden rounded-2xl border border-neutral-300 bg-white">
      {item.imageUrl
        ? (
            <Image
              source={{ uri: item.imageUrl }}
              className="aspect-video w-full bg-neutral-200"
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={item.title}
            />
          )
        : null}
      <View className="gap-3 p-5">
        {meta
          ? (
              <Text className="font-mono text-[10px] tracking-wider text-neutral-500 uppercase">
                {meta}
              </Text>
            )
          : null}
        <Text className="font-sans text-xl font-semibold text-neutral-950">
          {item.title}
        </Text>
        {item.excerpt
          ? (
              <Text className="font-sans text-sm/5 text-neutral-600" numberOfLines={3}>
                {item.excerpt}
              </Text>
            )
          : null}
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
          {item.authorName
            ? <Text className="font-sans text-xs text-neutral-600">{item.authorName}</Text>
            : null}
          <Text className="font-sans text-xs text-neutral-500">
            {formatCount(item.likeCount, 'like', 'likes')}
          </Text>
          <Text className="font-sans text-xs text-neutral-500">
            {formatCount(item.commentCount, 'comment', 'comments')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MemberFeedCard({ item, onOpen }: MemberFeedCardProps) {
  if (!item.spaceId) {
    return <CardBody item={item} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => onOpen(item.spaceId!, item.id)}
    >
      <CardBody item={item} />
    </Pressable>
  );
}
