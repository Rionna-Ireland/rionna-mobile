import type { MemberContentScope } from '@/features/member-content/types';

import { useRouter } from 'expo-router';
import * as React from 'react';

import { IconButton } from '@/components/ui';
import { usePostableSpaces } from '@/features/community-posting/api/use-postable-spaces';
import { PlusGlyph } from '@/features/community-posting/components/plus-glyph';
import { translate } from '@/lib/i18n';

type NewPostButtonProps = {
  scope: MemberContentScope;
  /** Spaces behind the feed's selected chip; the first postable one is preselected. */
  spaceIds?: string[];
};

/**
 * "New post" action in the Community header: a 52pt lilac square "+" (S13-06).
 * Hides itself when the member has nowhere postable (no spaces, or the
 * postable-spaces query errored) rather than leaving a dead-end button.
 */
export function NewPostButton({ scope, spaceIds = [] }: NewPostButtonProps) {
  const router = useRouter();
  const spacesQuery = usePostableSpaces(scope);

  const hasPostableSpaces = !spacesQuery.isError && (spacesQuery.data?.spaces.length ?? 0) > 0;
  if (!hasPostableSpaces) {
    return null;
  }
  const spaceId = spaceIds.find(id => spacesQuery.data?.spaces.some(space => space.id === id));

  return (
    <IconButton
      testID="new-post-button"
      variant="square-accent"
      accessibilityLabel={translate('community.space.newPostA11y')}
      onPress={() => router.push(spaceId ? `/post/new?spaceId=${encodeURIComponent(spaceId)}` : '/post/new')}
      className="size-[52px] border border-on-primary-container"
    >
      <PlusGlyph />
    </IconButton>
  );
}
