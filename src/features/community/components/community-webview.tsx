import type { WebViewNavigation, WebView as WebViewType } from 'react-native-webview';

import * as React from 'react';
import { useCallback, useRef, useState } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIndicator, View } from '@/components/ui';
import { CommunityPlaceholder } from '@/features/community/components/community-placeholder';
import { useCommunitySession } from '@/features/community/hooks/use-community-session';

// Lazy-require so a missing native module doesn't crash the whole route
// (e.g. before the dev client has been rebuilt with react-native-webview).
let WebView: typeof WebViewType | null = null;
try {
  WebView = require('react-native-webview').WebView;
}
catch {
  WebView = null;
}

const CIRCLE_CSS_OVERRIDES = `
  (function() {
    var style = document.createElement('style');
    style.textContent = \`
      /* Hide Circle's top navigation bar */
      .top-bar, .mobile-top-bar, [data-testid="top-bar"] {
        display: none !important;
      }
      /* Hide Circle's mobile app download banner */
      .app-banner, .download-app-banner,
      [class*="DownloadAppPrompt"], [class*="MobileAppBanner"] {
        display: none !important;
      }
      /* Match brand primary colour */
      :root {
        --primary-color: #D63384;
      }
    \`;
    document.head.appendChild(style);
  })();
  true;
`;

type Props = {
  initialUrl?: string;
};

export function CommunityWebView({ initialUrl }: Props) {
  const { communityUrl, loading, error, refresh } = useCommunitySession(initialUrl);
  const [pageLoading, setPageLoading] = useState(true);
  const webviewRef = useRef<WebViewType>(null);
  const insets = useSafeAreaInsets();

  // Only auto-refresh on session-expired URLs when we actually have an authed
  // session to refresh -- otherwise the user can never reach the Circle login
  // form (we'd loop them out of it).
  const hasAuthedSession = communityUrl?.includes('/session/cookies?access_token=') ?? false;

  const handleNavStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (!hasAuthedSession)
        return;
      if (
        navState.url.includes('/session/expired')
        || navState.url.includes('/login')
        || navState.url.includes('/sign_in')
      ) {
        refresh();
      }
    },
    [refresh, hasAuthedSession],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#D63384" />
      </View>
    );
  }

  if (error || !communityUrl) {
    return <CommunityPlaceholder message="Community unavailable" />;
  }

  if (!WebView) {
    return (
      <CommunityPlaceholder message="WebView native module not loaded — rebuild the dev client (pnpm ios)." />
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#fff' }}>
      <WebView
        ref={webviewRef}
        source={{ uri: communityUrl }}
        style={{ flex: 1 }}
        onNavigationStateChange={handleNavStateChange}
        onLoadStart={(e) => {
          console.log('[CommunityWebView] loadStart', e.nativeEvent.url);
          setPageLoading(true);
        }}
        onLoadEnd={(e) => {
          console.log('[CommunityWebView] loadEnd', e.nativeEvent.url);
          setPageLoading(false);
        }}
        onError={(e) => {
          console.warn('[CommunityWebView] error', e.nativeEvent);
          setPageLoading(false);
        }}
        onHttpError={(e) => {
          console.warn(
            '[CommunityWebView] httpError',
            e.nativeEvent.statusCode,
            e.nativeEvent.url,
          );
        }}
        injectedJavaScript={CIRCLE_CSS_OVERRIDES}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        applicationNameForUserAgent="PinkConnections/1.0"
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 PinkConnections/1.0"
      />
      {pageLoading && (
        <View
          className="absolute inset-0 items-center justify-center bg-white/80"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#D63384" />
        </View>
      )}
    </View>
  );
}
