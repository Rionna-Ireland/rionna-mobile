import type { MemberContentScope } from '@/features/member-content/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, Text } from 'react-native';

import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';
import { usePostableSpaces } from '@/features/community-posting/api/use-postable-spaces';

type NewPostButtonProps = {
  scope: MemberContentScope;
};

/**
 * Floating "New post" action on the Community tab. Hides itself when the
 * member has nowhere postable (no spaces, or the postable-spaces query
 * errored) rather than leaving a dead-end button on screen.
 */
export function NewPostButton({ scope }: NewPostButtonProps) {
  const router = useRouter();
  const spacesQuery = usePostableSpaces(scope);
  const bottomOffset = useTabBarContentPadding(16);

  const hasPostableSpaces = !spacesQuery.isError && (spacesQuery.data?.spaces.length ?? 0) > 0;
  if (!hasPostableSpaces) {
    return null;
  }

  return (
    <Pressable
      testID="new-post-button"
      accessibilityRole="button"
      accessibilityLabel="New post"
      onPress={() => router.push('/post/new')}
      style={{ bottom: bottomOffset }}
      className="absolute right-6 size-14 items-center justify-center rounded-full bg-violet-700 shadow-lg"
    >
      <Text className="font-sans text-2xl font-semibold text-white">+</Text>
    </Pressable>
  );
}
