import { Alert } from 'react-native';

import { translate } from '@/lib/i18n';
import { haptics } from '@/lib/motion';

/**
 * Native confirm before deleting a comment (S14-08 A-017), matching the post
 * delete confirm. Confirming plays `warning()`, the destructive-confirm haptic.
 */
export function confirmDeleteComment(onConfirm: () => void) {
  Alert.alert(
    translate('community.comment.deleteConfirmTitle'),
    translate('community.comment.deleteConfirmBody'),
    [
      { text: translate('community.comment.deleteCancel'), style: 'cancel' },
      {
        text: translate('community.comment.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          haptics.warning();
          onConfirm();
        },
      },
    ],
  );
}
