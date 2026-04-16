import type { TrainerPost } from '@/features/pulse/types';

import { useRouter } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui';
import { relativeTime } from '@/features/pulse/components/relative-time';
import { TileWrapper } from '@/features/pulse/components/tile-wrapper';

type TrainerUpdatesTileProps = {
  data: TrainerPost[] | undefined;
  isLoading: boolean;
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function PostRow({ post }: { post: TrainerPost }) {
  const router = useRouter();
  const excerpt = post.body?.plain_text_body
    ? truncate(post.body.plain_text_body, 80)
    : post.name;

  return (
    <Pressable
      onPress={() =>
        router.navigate({
          pathname: '/(app)/community',
          params: post.url ? { url: post.url } : {},
        })}
      className="gap-1 px-4 py-3"
    >
      <Text className="text-sm text-foreground">{excerpt}</Text>
      <Text className="text-xs text-neutral-400">
        {relativeTime(post.created_at)}
      </Text>
    </Pressable>
  );
}

export function TrainerUpdatesTile({
  data,
  isLoading,
}: TrainerUpdatesTileProps) {
  const hasUpdates = data && data.length > 0;

  return (
    <TileWrapper title="Trainer Updates" isLoading={isLoading}>
      {hasUpdates
        ? (
            <View className="pb-2">
              {data.map(post => (
                <PostRow key={post.id} post={post} />
              ))}
            </View>
          )
        : (
            <View className="px-4 pb-4">
              <Text className="text-sm text-neutral-400">
                No trainer updates yet
              </Text>
            </View>
          )}
    </TileWrapper>
  );
}
