import type { AuthUser } from '@/lib/auth/utils';

import * as React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

type MinimalAccountSheetProps = {
  visible: boolean;
  member: AuthUser;
  onClose: () => void;
  onSignOut: () => void;
};

export function MinimalAccountSheet({
  visible,
  member,
  onClose,
  onSignOut,
}: MinimalAccountSheetProps) {
  const displayName = member.name?.trim() || 'Rionna member';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/30">
        <Pressable
          className="flex-1"
          accessibilityRole="button"
          accessibilityLabel="Close account"
          onPress={onClose}
        />
        <View className="rounded-t-3xl border-t border-neutral-300 bg-white px-6 pt-4 pb-10">
          <View className="mb-6 h-1 w-10 self-center rounded-full bg-neutral-300" />
          <View className="mb-8 flex-row items-center gap-4">
            <View className="size-12 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100">
              <Text className="font-sans text-lg font-semibold text-neutral-900">
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans text-lg font-semibold text-neutral-950">
                {displayName}
              </Text>
              <Text className="mt-1 font-sans text-sm text-neutral-600">
                {member.email}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={onSignOut}
            className="h-12 items-center justify-center rounded-xl border border-neutral-400 bg-white"
          >
            <Text className="font-sans text-base font-semibold text-neutral-950">
              Sign out
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
