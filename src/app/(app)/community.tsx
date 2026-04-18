import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { CommunityPlaceholder } from '@/features/community/components/community-placeholder';
import { CommunityWebView } from '@/features/community/components/community-webview';
import { getCircleCommunityBaseUrl } from '@/features/community/lib/circle-target';

export default function CommunityScreen() {
  const params = useLocalSearchParams<{ url?: string }>();

  if (!getCircleCommunityBaseUrl()) {
    return <CommunityPlaceholder />;
  }

  return <CommunityWebView initialUrl={params.url} />;
}
