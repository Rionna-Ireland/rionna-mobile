import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { COMMUNITY_BACKGROUND_COLOR } from '@/features/community/lib/community-theme';
import { useCommunityPanelStore } from '@/features/community/lib/use-community-panel-store';

// S6-05: the Community WebView is a persistent singleton mounted at the app root
// (CommunityPanel in _layout). This route is now just a thin, transparent shell:
// on focus it shows the panel (carrying any deep-link target); on blur it hides
// it. The panel draws its own header, so the native Stack header is hidden here.
export default function CommunityViewScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const initialUrl = Array.isArray(params.url) ? params.url[0] : params.url;

  const show = useCommunityPanelStore.use.show();
  const hide = useCommunityPanelStore.use.hide();

  useFocusEffect(
    React.useCallback(() => {
      show(initialUrl ?? null);
      return () => hide();
    }, [show, hide, initialUrl]),
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: COMMUNITY_BACKGROUND_COLOR }} />
    </>
  );
}
