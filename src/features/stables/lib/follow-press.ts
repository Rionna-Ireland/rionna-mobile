import { Alert } from 'react-native';

import { tx } from '@/features/stables/lib/tx';
import { translate } from '@/lib/i18n';
import { haptics } from '@/lib/motion';

export type FollowPressInput = {
  isFollowing: boolean;
  pending?: boolean;
  onToggle: (following: boolean) => void;
  /** Invite-only horses (S9-05): unfollowing confirms first. */
  confirmBeforeUnfollow?: { horseName: string };
};

/**
 * What a Follow press does: follow directly (with `success()`), or unfollow,
 * confirming first for invite-only horses. Exported so a card can expose the
 * same intent as a VoiceOver custom action (A-004).
 */
export function pressFollowToggle({
  isFollowing,
  pending = false,
  onToggle,
  confirmBeforeUnfollow,
}: FollowPressInput) {
  if (pending)
    return;
  const next = !isFollowing;
  if (!next && confirmBeforeUnfollow) {
    const { horseName } = confirmBeforeUnfollow;
    Alert.alert(
      tx('stables.follow.leaveTitle', { name: horseName }),
      tx('stables.follow.leaveBody', { name: horseName }),
      [
        { text: translate('stables.follow.leaveCancel'), style: 'cancel' },
        { text: translate('stables.follow.leaveConfirm'), style: 'destructive', onPress: () => onToggle(false) },
      ],
    );
    return;
  }
  if (next)
    haptics.success();
  onToggle(next);
}
