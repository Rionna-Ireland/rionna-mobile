import type { NewsItem } from '@/features/pulse/api/use-latest-news';

import { useRouter } from 'expo-router';

import { Image, Pressable, Text, View } from '@/components/ui';
import { TileWrapper } from '@/features/pulse/components/tile-wrapper';

function FeaturedNewsRow({ item }: { item: NewsItem }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/news/${item.slug}`)}
      className="gap-2 px-4 py-3"
    >
      {item.featuredImageUrl
        ? (
            <Image
              source={{ uri: `${item.featuredImageUrl}?width=400&quality=80` }}
              className="aspect-video w-full rounded-lg"
              contentFit="cover"
            />
          )
        : null}
      <Text className="text-sm font-semibold text-foreground">
        {item.title}
      </Text>
      {item.author
        ? (
            <Text className="text-xs text-neutral-400">{item.author.name}</Text>
          )
        : null}
    </Pressable>
  );
}

function CompactNewsRow({ item }: { item: NewsItem }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/news/${item.slug}`)}
      className="px-4 py-3"
    >
      <Text className="text-sm font-semibold text-foreground">
        {item.title}
      </Text>
    </Pressable>
  );
}

type LatestNewsTileProps = {
  data: NewsItem[] | undefined;
  isLoading: boolean;
};

export function LatestNewsTile({ data, isLoading }: LatestNewsTileProps) {
  const hasNews = data && data.length > 0;

  return (
    <TileWrapper title="Latest News" isLoading={isLoading}>
      {hasNews
        ? (
            <View className="pb-2">
              {data.map((item, index) =>
                index === 0
                  ? (
                      <FeaturedNewsRow key={item.id} item={item} />
                    )
                  : (
                      <CompactNewsRow key={item.id} item={item} />
                    ),
              )}
            </View>
          )
        : (
            <View className="px-4 pb-4">
              <Text className="text-sm text-neutral-400">No news yet</Text>
            </View>
          )}
    </TileWrapper>
  );
}
