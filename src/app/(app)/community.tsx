import Env from 'env';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { CommunityPlaceholder } from '@/features/community/components/community-placeholder';
import { CommunityWebView } from '@/features/community/components/community-webview';

export default function CommunityScreen() {
  const params = useLocalSearchParams<{ url?: string }>();

  if (!Env.EXPO_PUBLIC_COMMUNITY_DOMAIN) {
    return <CommunityPlaceholder />;
  }

  return <CommunityWebView initialUrl={params.url} />;
}
