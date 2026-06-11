import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Pressable, SafeAreaView, Text } from '@/components/ui';
import { CommunityWebView } from '@/features/community/components/community-webview';
import { COMMUNITY_BACKGROUND_COLOR } from '@/features/community/lib/community-theme';
import { useCommunityPanelStore } from '@/features/community/lib/use-community-panel-store';

// Cream-paper stroke (matches --color-community-sidebar-border in the WebView
// theme) for the header hairline.
const HEADER_BORDER_COLOR = '#ece8df';

function PanelHeader() {
  const hide = useCommunityPanelStore.use.hide();

  const onBack = React.useCallback(() => {
    // Hide immediately for snappiness; the route change also blurs
    // community-view, whose useFocusEffect cleanup hides as a backstop.
    hide();
    router.replace('/');
  }, [hide]);

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} className="px-1 py-2" hitSlop={8}>
        <Text className="font-sans text-base font-semibold text-primary">Back</Text>
      </Pressable>
      <Text className="ml-2 font-sans text-base font-semibold text-foreground">
        Community
      </Text>
    </View>
  );
}

/**
 * Root-mounted persistent Community panel (S6-05). Mounted ONCE in _layout's
 * Providers. It draws its own header (the native Stack header is hidden on the
 * community-view route) and hosts the never-unmounted CommunityWebView.
 *
 * - `activated` gates the first mount (no eager startup cost).
 * - `visible` toggles opacity + pointerEvents only — the WebView is NEVER
 *   conditionally unmounted while activated (that would suspend the WK content
 *   process and lose the warm SPA). Sign-out flips `activated` false, which is
 *   the one intended teardown.
 */
export function CommunityPanel() {
  const activated = useCommunityPanelStore.use.activated();
  const visible = useCommunityPanelStore.use.visible();

  if (!activated) {
    return null;
  }

  return (
    <View
      style={[styles.overlay, { opacity: visible ? 1 : 0 }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <SafeAreaView edges={['top']} style={styles.fill}>
        <PanelHeader />
        <CommunityWebView />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COMMUNITY_BACKGROUND_COLOR,
  },
  fill: {
    flex: 1,
    backgroundColor: COMMUNITY_BACKGROUND_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HEADER_BORDER_COLOR,
    backgroundColor: COMMUNITY_BACKGROUND_COLOR,
  },
});
