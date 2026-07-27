import type { WebViewNavigation, WebView as WebViewType } from 'react-native-webview';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ActivityIndicator, View } from '@/components/ui';
import { CommunityPlaceholder } from '@/features/community/components/community-placeholder';
import { useCommunitySession } from '@/features/community/hooks/use-community-session';
import {
  buildBootstrapScript,
  isTerminalBootstrapMessage,
} from '@/features/community/lib/circle-bootstrap-script';
import { COMMUNITY_BACKGROUND_COLOR } from '@/features/community/lib/community-theme';
import { useCommunityPanelStore } from '@/features/community/lib/use-community-panel-store';

// Lazy-require so a missing native module doesn't crash the whole route
// (e.g. before the dev client has been rebuilt with react-native-webview).
let WebView: typeof WebViewType | null = null;
try {
  WebView = require('react-native-webview').WebView;
}
catch {
  WebView = null;
}

type WebViewLoadEvent = {
  nativeEvent: {
    url: string;
  };
};

type WebViewErrorEvent = {
  nativeEvent: unknown;
};

type WebViewHttpErrorEvent = {
  nativeEvent: {
    statusCode: number;
    url: string;
  };
};

type WebViewMessageEvent = {
  nativeEvent: {
    data: string;
  };
};

function isTerminalCircleAuthUrl(url: string): boolean {
  return (
    url.startsWith('https://login.circle.so/')
    || url.includes('/otp_confirmations')
    || url.includes('/users/sign_in')
    || url.includes('/users/sign_out')
  );
}

function isExpiredSessionUrl(url: string): boolean {
  return url.includes('/session/expired') || url.includes('state=expired');
}

function renderLoadingState() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COMMUNITY_BACKGROUND_COLOR }}>
      <ActivityIndicator size="large" color="#391d3a" />
    </View>
  );
}

function renderUnavailableState(errorMessage: string | null) {
  return <CommunityPlaceholder message={errorMessage ?? 'Community unavailable'} />;
}

type LoadedCommunityWebViewProps = {
  WebViewComponent: typeof WebViewType;
  bootstrapScript?: string;
  bootstrapUrl: string;
  bootstrapped: boolean;
  onMessage: (e: WebViewMessageEvent) => void;
  onNavigationStateChange: (navState: WebViewNavigation) => void;
  onProcessTerminate: () => void;
  webviewRef: React.RefObject<WebViewType | null>;
};

function LoadedCommunityWebView({
  WebViewComponent,
  bootstrapScript,
  bootstrapUrl,
  bootstrapped,
  onMessage,
  onNavigationStateChange,
  onProcessTerminate,
  webviewRef,
}: LoadedCommunityWebViewProps) {
  const [pageLoading, setLocalPageLoading] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: COMMUNITY_BACKGROUND_COLOR }}>
      <WebViewComponent
        ref={webviewRef}
        source={{ uri: bootstrapUrl }}
        style={{ flex: 1, backgroundColor: COMMUNITY_BACKGROUND_COLOR }}
        containerStyle={{ flex: 1, backgroundColor: COMMUNITY_BACKGROUND_COLOR }}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={(e: WebViewLoadEvent) => {
          console.log('[CommunityWebView] loadStart', e.nativeEvent.url);
          // Warm SPA navigations on Android fire loadStart without loadEnd —
          // only show the overlay during the cold bootstrap dance.
          if (!bootstrapped) {
            setLocalPageLoading(true);
          }
        }}
        onLoadProgress={(e) => {
          // Android onProgressChanged reaches 1.0 for SPA navigations where
          // loadEnd never fires — belt-and-braces alongside onLoadEnd.
          if (e.nativeEvent.progress === 1) {
            setLocalPageLoading(false);
          }
        }}
        onLoadEnd={(e: WebViewLoadEvent) => {
          console.log('[CommunityWebView] loadEnd', e.nativeEvent.url);
          setLocalPageLoading(false);
        }}
        onMessage={onMessage}
        onError={(e: WebViewErrorEvent) => {
          console.warn('[CommunityWebView] error', e.nativeEvent);
          setLocalPageLoading(false);
        }}
        onHttpError={(e: WebViewHttpErrorEvent) => {
          console.warn(
            '[CommunityWebView] httpError',
            e.nativeEvent.statusCode,
            e.nativeEvent.url,
          );
        }}
        // S6-05 hardening: a long-lived WKWebView can have its content process
        // killed under memory pressure. Treat it as a cold open — drop the
        // bootstrap flag and reload (the before-content bootstrap script re-runs
        // on reload). onRenderProcessGone is the Android equivalent.
        onContentProcessDidTerminate={() => {
          console.warn('[CommunityWebView] content process terminated — reloading');
          onProcessTerminate();
          webviewRef.current?.reload();
        }}
        onRenderProcessGone={() => {
          console.warn('[CommunityWebView] render process gone — reloading');
          onProcessTerminate();
          webviewRef.current?.reload();
        }}
        injectedJavaScriptBeforeContentLoaded={bootstrapScript}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        applicationNameForUserAgent="Rionna/1.0"
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 Rionna/1.0"
      />
      {(pageLoading || !bootstrapped) && (
        <View
          className="absolute inset-0 items-center justify-center bg-background/80"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#391d3a" />
        </View>
      )}
    </View>
  );
}

// The bootstrap-script builder and isTerminalBootstrapMessage helper now live
// in @/features/community/lib/circle-bootstrap-script so the offscreen
// pre-warm WebView (S6-03 B4) shares one source of truth with this component.

type WarmDeepLinkOpts = {
  bootstrapped: boolean;
  communityBaseUrl: string | null;
  pendingTarget: string | null;
  postBootstrapPath: string;
  clearPendingTarget: () => void;
};

// Warm-state deep-link fix (next-steps.md P1.1). When the singleton is ALREADY
// bootstrapped and a NEW push/Pulse target arrives via the store's
// `pendingTarget`, the initial load has long finished and won't re-navigate on
// its own — so we explicitly drive it to the new target, then clear it.
//
// The target present at first mount is handled by the initial load's
// `postBootstrapPath`, so the ref is seeded with it: the effect only fires for
// NEW targets that arrive while warm, never a redundant re-navigation when
// bootstrap completes on a cold open.
function useWarmDeepLinkNavigation(
  webviewRef: React.RefObject<WebViewType | null>,
  { bootstrapped, communityBaseUrl, pendingTarget, postBootstrapPath, clearPendingTarget }: WarmDeepLinkOpts,
) {
  const handledTargetRef = useRef<string | null>(pendingTarget);
  const isForcedDeepLinkTarget
    = !!pendingTarget && (pendingTarget.startsWith('/') || pendingTarget.startsWith('http'));

  useEffect(() => {
    if (
      !bootstrapped
      || !isForcedDeepLinkTarget
      || !communityBaseUrl
      || !pendingTarget
      || handledTargetRef.current === pendingTarget
    ) {
      return;
    }

    handledTargetRef.current = pendingTarget;
    const target = `${communityBaseUrl}${postBootstrapPath}`;
    webviewRef.current?.injectJavaScript(
      `window.location.replace(${JSON.stringify(target)}); true;`,
    );
    clearPendingTarget();
  }, [bootstrapped, isForcedDeepLinkTarget, communityBaseUrl, pendingTarget, postBootstrapPath, clearPendingTarget, webviewRef]);
}

export function CommunityWebView() {
  // S6-05: the WebView is a root-mounted singleton driven by the panel store,
  // NOT by a route prop. The deep-link target and the session-scoped
  // `bootstrapped` flag both live in the store.
  const pendingTarget = useCommunityPanelStore.use.pendingTarget();
  const bootstrapped = useCommunityPanelStore.use.bootstrapped();
  const setBootstrapped = useCommunityPanelStore.use.setBootstrapped();
  const clearPendingTarget = useCommunityPanelStore.use.clearPendingTarget();

  const { accessToken, communityBaseUrl, bootstrapUrl, postBootstrapPath, error, errorMessage, refresh }
    = useCommunitySession(pendingTarget ?? undefined);
  const webviewRef = useRef<WebViewType>(null);

  useWarmDeepLinkNavigation(webviewRef, {
    bootstrapped,
    communityBaseUrl,
    pendingTarget,
    postBootstrapPath,
    clearPendingTarget,
  });

  const handleNavStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url;
      if (isTerminalCircleAuthUrl(url)) {
        return;
      }

      if (isExpiredSessionUrl(url)) {
        refresh();
      }
    },
    [refresh],
  );

  // Precompute the bootstrap script once per (accessToken, postBootstrapPath)
  // pair so injectedJavaScriptBeforeContentLoaded gets a stable value —
  // some WebView implementations only honor this prop at mount, and changing
  // it after mount is a no-op on iOS.
  const bootstrapScript = React.useMemo(
    () => (accessToken ? buildBootstrapScript(accessToken, postBootstrapPath) : undefined),
    [accessToken, postBootstrapPath],
  );

  const handleMessage = useCallback(
    (e: { nativeEvent: { data: string } }) => {
      console.log('[CommunityWebView] message', e.nativeEvent.data);
      try {
        const payload = JSON.parse(e.nativeEvent.data);
        if (isTerminalBootstrapMessage(payload)) {
          setBootstrapped(true);
        }
      }
      catch {
        // Non-JSON message (unlikely) — ignore.
      }
    },
    [setBootstrapped],
  );

  if (!WebView) {
    return (
      <CommunityPlaceholder message="WebView native module not loaded — rebuild the dev client (pnpm ios)." />
    );
  }

  // Once we have a bootstrapUrl the WebView stays mounted for the rest of the
  // session (S6-05 never-unmount): tearing it down on a transient `loading` /
  // `refresh` would suspend the content process and defeat warm reuse. Before
  // the first session resolves, show loading; a hard error with no base URL is
  // unavailable.
  if (!bootstrapUrl) {
    return error ? renderUnavailableState(errorMessage) : renderLoadingState();
  }

  return (
    <LoadedCommunityWebView
      WebViewComponent={WebView}
      bootstrapScript={bootstrapScript}
      bootstrapUrl={bootstrapUrl}
      bootstrapped={bootstrapped}
      onMessage={handleMessage}
      onNavigationStateChange={handleNavStateChange}
      onProcessTerminate={() => setBootstrapped(false)}
      webviewRef={webviewRef}
    />
  );
}
