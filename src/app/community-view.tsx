import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { Pressable, Text } from '@/components/ui';
import { CommunityPlaceholder } from '@/features/community/components/community-placeholder';
import { CommunityWebView } from '@/features/community/components/community-webview';
import { getCircleCommunityBaseUrl } from '@/features/community/lib/circle-target';

export default function CommunityViewScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const initialUrl = Array.isArray(params.url) ? params.url[0] : params.url;

  if (!getCircleCommunityBaseUrl()) {
    return <CommunityPlaceholder />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Community',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.replace('/')} className="px-1 py-2">
              <Text className="font-sans text-base font-semibold text-primary">
                Back
              </Text>
            </Pressable>
          ),
        }}
      />
      <CommunityWebView key={initialUrl ?? 'community-home'} initialUrl={initialUrl} />
    </>
  );
}
