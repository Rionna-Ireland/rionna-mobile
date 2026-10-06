import type { ReportReason, ReportTarget } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import * as React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import colors from '@/components/ui/colors';
import { Modal, useModal } from '@/components/ui/modal';
import { MotionPressable } from '@/components/ui/pressable';
import { useReportContent } from '@/features/community-posting/api/use-report-content';
import { translate } from '@/lib/i18n';

type ReportSheetProps = {
  scope: MemberContentScope;
  /** The post/comment being reported; presents the sheet on every non-null value. */
  target: ReportTarget | null;
  onClose: () => void;
};

const REASON_KEYS = {
  spam: 'community.report.spam',
  abusive: 'community.report.abusive',
  off_topic: 'community.report.offTopic',
  other: 'community.report.other',
} as const satisfies Record<ReportReason, string>;

const REASONS = Object.keys(REASON_KEYS) as ReportReason[];

const NOTE_MAX = 500;

function ReportReasonOption({
  reason,
  selected,
  onSelect,
}: {
  reason: ReportReason;
  selected: boolean;
  onSelect: (value: ReportReason) => void;
}) {
  const label = translate(REASON_KEYS[reason]);
  return (
    <MotionPressable
      size="flat"
      pressedOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onSelect(reason)}
    >
      {/* The dimmed state lives on an inner view: the press opacity drives the pressable's own. */}
      <View
        className={`flex-row items-center justify-between border-b border-outline-variant py-3.5 ${
          selected ? 'opacity-100' : 'opacity-80'
        }`}
      >
        <Text className="font-sans text-base text-ink">{label}</Text>
        {selected ? <Text className="font-sans text-sm text-primary">{translate('community.report.selected')}</Text> : null}
      </View>
    </MotionPressable>
  );
}

/**
 * Shared report sheet for posts and comments: pick a reason (a note only for
 * "Other"), send via `useReportContent`, and surface the outcome as an
 * alert-based toast since the app has no dedicated toast/snackbar helper.
 */
export function ReportSheet({ scope, target, onClose }: ReportSheetProps) {
  const modal = useModal();
  const { report, isPending } = useReportContent(scope);
  const [reason, setReason] = React.useState<ReportReason>('spam');
  const [note, setNote] = React.useState('');

  const presentRef = React.useRef(modal.present);
  presentRef.current = modal.present;

  React.useEffect(() => {
    if (target) {
      setReason('spam');
      setNote('');
      presentRef.current();
    }
  }, [target]);

  const closeSheet = React.useCallback(() => {
    modal.dismiss();
    onClose();
  }, [modal, onClose]);

  const onSend = React.useCallback(async () => {
    if (!target) {
      return;
    }
    const ok = await report({
      surface: target.surface,
      postId: target.postId,
      commentId: target.commentId,
      spaceId: target.spaceId,
      excerpt: target.excerpt,
      authorName: target.authorName,
      reason,
      note: reason === 'other' ? (note.trim() || undefined) : undefined,
    });
    if (ok) {
      closeSheet();
      Alert.alert(translate('community.report.sent'));
    }
    else {
      Alert.alert(translate('community.report.failed'));
    }
  }, [target, report, reason, note, closeSheet]);

  return (
    <Modal ref={modal.ref} title={translate('community.report.title')} onDismiss={onClose} snapPoints={[reason === 'other' ? '78%' : '62%']}>
      <View className="px-4 pb-6">
        {REASONS.map(item => (
          <ReportReasonOption key={item} reason={item} selected={reason === item} onSelect={setReason} />
        ))}
        {reason === 'other'
          ? (
              <TextInput
                accessibilityLabel={translate('community.report.noteA11y')}
                placeholder={translate('community.report.notePlaceholder')}
                placeholderTextColor={colors.inkMuted}
                value={note}
                onChangeText={setNote}
                maxLength={NOTE_MAX}
                multiline
                textAlignVertical="top"
                className="mt-3 min-h-24 rounded-2xl border border-outline-variant bg-white px-4 py-3 font-sans text-sm text-ink"
              />
            )
          : null}
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={translate('community.report.sendA11y')}
          disabled={isPending}
          onPress={() => void onSend()}
          className={`mt-4 items-center rounded-2xl px-4 py-3 ${isPending ? 'bg-ink-muted' : 'bg-primary'}`}
        >
          <Text className="font-sans-semibold text-base text-white">
            {translate(isPending ? 'community.report.sending' : 'community.report.send')}
          </Text>
        </MotionPressable>
      </View>
    </Modal>
  );
}
