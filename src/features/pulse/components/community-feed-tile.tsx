import type { CircleFeedItem } from '@/features/pulse/types';

import { useRouter } from 'expo-router';

import { Image, Pressable, Text, View } from '@/components/ui';
import { relativeTime } from '@/features/pulse/components/relative-time';
import { TileWrapper } from '@/features/pulse/components/tile-wrapper';

type CommunityFeedTileProps = {
  title: string;
  data: CircleFeedItem[] | undefined;
  emptyMessage: string;
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function FeedRow({ item }: { item: CircleFeedItem }) {
  const router = useRouter();
  const excerpt = item.excerpt ? truncate(item.excerpt, 96) : item.title;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/community-view',
          params: item.url ? { url: item.url } : {},
        })}
      className="gap-2 px-6 py-4"
    >
      {item.imageUrl
        ? (
            <Image
              source={{ uri: item.imageUrl }}
              className="aspect-video w-full rounded-lg"
              contentFit="cover"
            />
          )
        : null}
      <Text className="font-sans text-base font-semibold text-ink">
        {item.title}
      </Text>
      {excerpt && excerpt !== item.title && (
        <Text className="font-sans text-sm/5 text-ink-variant">
          {excerpt}
        </Text>
      )}
      <View className="flex-row items-center gap-3">
        {item.authorName && (
          <Text className="font-mono text-xs tracking-wider text-ink-variant uppercase">
            {item.authorName}
          </Text>
        )}
        {(item.commentCount > 0 || item.likeCount > 0) && (
          <Text className="font-mono text-xs tracking-wider text-ink-variant uppercase">
            {item.commentCount}
            {' '}
            replies
          </Text>
        )}
      </View>
      <Text className="font-mono text-xs tracking-wider text-ink-variant uppercase">
        {item.spaceName ? `${item.spaceName} - ` : ''}
        {item.createdAt ? relativeTime(item.createdAt) : 'Community'}
      </Text>
    </Pressable>
  );
}

export function CommunityFeedTile({
  title,
  data,
  emptyMessage,
  isLoading,
  isError = false,
  errorMessage = 'Could not load Circle posts',
}: CommunityFeedTileProps) {
  const hasItems = data && data.length > 0;

  return (
    <TileWrapper title={title} isLoading={isLoading}>
      {isError
        ? (
            <View className="px-6 pb-6">
              <Text className="font-sans text-base text-destructive">
                {errorMessage}
              </Text>
            </View>
          )
        : hasItems
          ? (
              <View className="pb-2">
                {data.map(item => (
                  <FeedRow key={item.id} item={item} />
                ))}
              </View>
            )
          : (
              <View className="px-6 pb-6">
                <Text className="font-sans text-base text-ink-variant">
                  {emptyMessage}
                </Text>
              </View>
            )}
    </TileWrapper>
  );
}
