import type { MemberContentScope } from '@/features/member-content/types';

import * as React from 'react';
import { Alert, Text, View } from 'react-native';

import { Modal, useModal } from '@/components/ui/modal';
import { MotionPressable } from '@/components/ui/pressable';
import { useDeletePost } from '@/features/community-posting/api/use-delete-post';
import { translate } from '@/lib/i18n';
import { haptics } from '@/lib/motion';

type PostOverflowMenuProps = {
  scope: MemberContentScope;
  postId: string;
  spaceId: string | null;
  /** Whether the signed-in member authored the post — gates the Delete post option. */
  isOwn: boolean;
  onReportPost: () => void;
  /** Called once the post has actually been deleted. */
  onDeleted: () => void;
};

/**
 * Post "···" overflow menu: always offers Report post, and Delete post when
 * the member owns the post. Owns its own delete mutation and confirm/error
 * alerts, the same way `ReportSheet` owns `useReportContent`.
 */
export function PostOverflowMenu({ scope, postId, spaceId, isOwn, onReportPost, onDeleted }: PostOverflowMenuProps) {
  const modal = useModal();
  const { remove, isPending } = useDeletePost(scope);

  const onReport = React.useCallback(() => {
    modal.dismiss();
    onReportPost();
  }, [modal, onReportPost]);

  const runDelete = React.useCallback(async () => {
    if (!spaceId) {
      Alert.alert(translate('community.postMenu.deleteFailed'));
      return;
    }
    const ok = await remove({ spaceId, postId });
    if (ok) {
      onDeleted();
    }
    else {
      Alert.alert(translate('community.postMenu.deleteFailed'));
    }
  }, [spaceId, postId, remove, onDeleted]);

  const onDelete = React.useCallback(() => {
    modal.dismiss();
    Alert.alert(
      translate('community.postMenu.deleteConfirmTitle'),
      translate('community.comment.deleteConfirmBody'),
      [
        { text: translate('community.comment.deleteCancel'), style: 'cancel' },
        {
          text: translate('community.comment.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            haptics.warning();
            void runDelete();
          },
        },
      ],
    );
  }, [modal, runDelete]);

  return (
    <>
      <MotionPressable
        size="small"
        accessibilityRole="button"
        accessibilityLabel={translate('community.postMenu.optionsA11y')}
        hitSlop={8}
        onPress={modal.present}
        testID="post-overflow-trigger"
      >
        <Text className="px-2 font-sans-semibold text-xl text-ink">···</Text>
      </MotionPressable>
      <Modal ref={modal.ref} snapPoints={[isOwn ? '36%' : '28%']}>
        <View className="px-4 pb-6">
          <MotionPressable
            size="flat"
            pressedOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={translate('community.postMenu.report')}
            onPress={onReport}
            className="border-b border-outline-variant py-3.5"
          >
            <Text className="font-sans text-base text-ink">{translate('community.postMenu.report')}</Text>
          </MotionPressable>
          {isOwn
            ? (
                <MotionPressable
                  size="flat"
                  pressedOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={translate('community.postMenu.delete')}
                  disabled={isPending}
                  onPress={onDelete}
                  className="py-3.5"
                >
                  <Text className="font-sans text-base text-danger-700">{translate('community.postMenu.delete')}</Text>
                </MotionPressable>
              )
            : null}
        </View>
      </Modal>
    </>
  );
}
