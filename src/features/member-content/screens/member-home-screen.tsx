import type { MemberContentState, MemberFeedItem } from '@/features/member-content/types';
import type { AuthUser } from '@/lib/auth/utils';

import Env from 'env';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { signOut, useAuthStore } from '@/features/auth/use-auth-store';
import { useMemberFeed } from '@/features/member-content/api/use-member-feed';
import { MemberFeedCard } from '@/features/member-content/components/member-feed-card';
import { MinimalAccountSheet } from '@/features/member-content/components/minimal-account-sheet';

type MemberHomeViewProps = {
  member: AuthUser;
  items: MemberFeedItem[] | undefined;
  contentState: MemberContentState;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onOpenPost: (spaceId: string, postId: string) => void;
  onSignOut: () => void;
};

function EmptyState({
  testID,
  title,
  message,
}: {
  testID: string;
  title: string;
  message: string;
}) {
  return (
    <View testID={testID} className="rounded-2xl border border-neutral-300 bg-white p-6">
      <Text className="font-sans text-lg font-semibold text-neutral-950">{title}</Text>
      <Text className="mt-2 font-sans text-sm/5 text-neutral-600">{message}</Text>
    </View>
  );
}

export function MemberHomeView({
  member,
  items,
  contentState,
  isLoading,
  isRefetching,
  onRefresh,
  onOpenPost,
  onSignOut,
}: MemberHomeViewProps) {
  const [accountVisible, setAccountVisible] = React.useState(false);
  const displayName = member.name?.trim() || 'Rionna member';

  return (
    <>
      <ScrollView
        className="flex-1 bg-neutral-100"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        <View className="mb-8 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="font-mono text-[10px] tracking-widest text-violet-700 uppercase">
              Members feed
            </Text>
            <Text className="mt-2 font-sans text-3xl font-semibold text-neutral-950">
              Home
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account"
            onPress={() => setAccountVisible(true)}
            className="size-11 items-center justify-center rounded-full border border-neutral-400 bg-white"
          >
            <Text className="font-sans text-base font-semibold text-neutral-950">
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {contentState === 'saved'
          ? (
              <View className="mb-4 rounded-xl border border-violet-300 bg-violet-50 px-4 py-3">
                <Text className="font-sans text-sm font-medium text-violet-900">
                  Showing saved content
                </Text>
              </View>
            )
          : null}

        <View className="gap-4">
          {isLoading && !items
            ? (
                <View testID="member-feed-loading" className="items-center py-16">
                  <ActivityIndicator color="#6D28D9" />
                  <Text className="mt-3 font-sans text-sm text-neutral-600">Loading your feed…</Text>
                </View>
              )
            : null}
          {!isLoading && contentState === 'empty'
            ? (
                <EmptyState
                  testID="member-feed-empty"
                  title="Nothing new yet"
                  message="New updates from your live circles will appear here."
                />
              )
            : null}
          {!isLoading && contentState === 'unavailable'
            ? (
                <EmptyState
                  testID="member-feed-unavailable"
                  title="Feed unavailable"
                  message="Check your connection and pull down to try again."
                />
              )
            : null}
          {items?.map(item => (
            <MemberFeedCard key={item.id} item={item} onOpen={onOpenPost} />
          ))}
        </View>
      </ScrollView>

      <MinimalAccountSheet
        visible={accountVisible}
        member={member}
        onClose={() => setAccountVisible(false)}
        onSignOut={onSignOut}
      />
    </>
  );
}

function SignedInMemberHome({ member }: { member: AuthUser }) {
  const router = useRouter();
  const scope = React.useMemo(
    () => ({ organizationId: Env.EXPO_PUBLIC_CLUB_ID, memberId: member.id }),
    [member.id],
  );
  const feed = useMemberFeed(scope);

  return (
    <MemberHomeView
      member={member}
      items={feed.data}
      contentState={feed.contentState}
      isLoading={feed.isLoading}
      isRefetching={feed.isRefetching}
      onRefresh={() => void feed.refetch()}
      onOpenPost={(spaceId, postId) => router.push(
        `/post/${encodeURIComponent(spaceId)}/${encodeURIComponent(postId)}`,
      )}
      onSignOut={() => void signOut()}
    />
  );
}

export function MemberHomeScreen() {
  const member = useAuthStore.use.user();
  return member ? <SignedInMemberHome member={member} /> : null;
}
