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

// Rebrand Circle's community WebView to the Rionna "Digital Estate" design
// system (see Architecture/design/design-system.md).
//
// Strategy: inject an author stylesheet that (a) re-declares Circle's CSS
// custom properties with !important and (b) restyles typography / chrome.
// Author !important beats inline style without !important, so this survives
// Circle's React rehydration writes to `<html style="…">`. A MutationObserver
// re-appends the <style> if anything in <head> removes it.
//
// Palette: primary = royal purple #391d3a, surface = cream paper #fcf9f2, ink
// = soft #1c1c18 (never pure black). Typography: Newsreader (display serif)
// + Manrope (body sans), both from Google Fonts.
const CIRCLE_CSS_OVERRIDES = `
  (function() {
    try {
      // --- 1. Load Rionna fonts (Fraunces as PP Eiko stand-in + Plus Jakarta Sans + IBM Plex Mono) ---
      var pre1 = document.createElement('link');
      pre1.rel = 'preconnect';
      pre1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(pre1);

      var pre2 = document.createElement('link');
      pre2.rel = 'preconnect';
      pre2.href = 'https://fonts.gstatic.com';
      pre2.crossOrigin = 'anonymous';
      document.head.appendChild(pre2);

      var fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2'
        + '?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600'
        + '&family=Plus+Jakarta+Sans:wght@400;500;600;700'
        + '&family=IBM+Plex+Mono:wght@400;500'
        + '&display=swap';
      document.head.appendChild(fontLink);

      // --- 2. Rionna theme stylesheet (author !important beats inline) ---
      var css = [
        ':root {',
        // Text -> soft ink (#1c1c18), never pure black
        '  --text-body: #1c1c18 !important;',
        '  --text-body-100: #1c1c18 !important;',
        '  --text-secondary: #5a544f !important;',
        '  --color-text-default: #1c1c18 !important;',
        '  --color-text-dark: #1c1c18 !important;',
        '  --color-text-darkest: #1c1c18 !important;',
        '  --color-text-very-dark: #1c1c18 !important;',
        '  --color-text-light: #5a544f !important;',
        '  --color-text-badge: #fcf9f2 !important;',
        '  --color-text-feature-dark: #fcf9f2 !important;',
        '  --color-text-feature-light: #fcf9f2 !important;',
        '  --color-text-icon-text: #fcf9f2 !important;',
        '  --color-community-sidebar-text: #1c1c18 !important;',
        '  --color-community-sidebar-text-on-accent: #fcf9f2 !important;',
        '  --color-community-header-text: #1c1c18 !important;',
        '  --color-community-header-active-text: #1c1c18 !important;',
        '  --color-community-active-item-text-color: #1c1c18 !important;',
        '  --color-text-selector-active: #1c1c18 !important;',
        '  --color-circle-button-text: #fcf9f2 !important;',
        '  --brand-button-text: #fcf9f2 !important;',
        // Muted microcopy — on-surface-variant
        '  --color-text-lightest: #8a8178 !important;',
        '  --color-text-timestamp-light: #a7998f !important;',
        '  --color-text-placeholder: #5a544f !important;',
        // Brand accent = royal purple #391d3a
        '  --brand: #391d3a !important;',
        '  --brand-light: #513351 !important;',
        '  --brand-dark: #2a122b !important;',
        '  --brand-button-hover: #513351 !important;',
        '  --color-text-link: #391d3a !important;',
        '  --color-text-blue-highlight: #391d3a !important;',
        '  --color-text-date-blue: #391d3a !important;',
        '  --compass-branded-button-bg: #391d3a !important;',
        '  --compass-branded-button-text: #fcf9f2 !important;',
        '  --compass-branded-badge-bg: #391d3a !important;',
        '  --compass-branded-badge-text: #fcf9f2 !important;',
        '  --compass-branded-badge-border: #391d3a !important;',
        '  --compass-branded-icon: #391d3a !important;',
        '  --compass-branded-link-text: #391d3a !important;',
        '  --color-circle-button-background: #391d3a !important;',
        '  --color-circle-button-background-hover: #513351 !important;',
        '  --color-border-circle-button: #391d3a !important;',
        '  --color-border-circle-button-hover: #513351 !important;',
        '  --color-ai-start: #391d3a !important;',
        '  --color-ai-end: #c39cc0 !important;',
        '  --color-support-widget-background: #391d3a !important;',
        // Cream-paper surface layering (Digital Estate stationery)
        '  --color-background-tertiary: #f1eee7 !important;',
        '  --color-background-secondary-dark: #f7f3eb !important;',
        '  --color-background-selector-active: #ece8df !important;',
        '  --color-background-light-blue: #f0ddef !important;',
        '  --color-community-sidebar-background: #ffffff !important;',
        '  --color-community-sidebar-active-background: #f1eee7 !important;',
        '  --color-community-sidebar-hover-background: #f7f3eb !important;',
        '  --color-community-sidebar-border: #ece8df !important;',
        '  --color-community-header-background: #fcf9f2 !important;',
        '  --color-community-header-hover-background: #f1eee7 !important;',
        '  --color-community-header-active-background: #ece8df !important;',
        '  --color-chip-background: #ece8df !important;',
        '  --color-text-chip: #391d3a !important;',
        '  --color-text-green-success: #1c1c18 !important;',
        '  --color-text-green-success-dark: #1c1c18 !important;',
        // "No-line" rule -> strokes lean on tonal layering; keep outline-variant for Circle
        '  --color-stroke-foreground: #d0c3cb !important;',
        '  --color-border-darkest: #d0c3cb !important;',
        '  --color-border-very-dark: #a7998f !important;',
        '  --font-system-ui: "Plus Jakarta Sans", InterVariable, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;',
        '}',

        // Cream-paper page background
        'html, body { background-color: #fcf9f2 !important; }',

        // Hide Circle chrome
        '.top-bar, .mobile-top-bar, [data-testid="top-bar"] { display: none !important; }',
        '.app-banner, .download-app-banner, [class*="DownloadAppPrompt"], [class*="MobileAppBanner"] { display: none !important; }',

        // Body font default — Plus Jakarta Sans
        'html, body, button, input, textarea, select, .post__body, [class*="RichText"] {',
        '  font-family: "Plus Jakarta Sans", InterVariable, system-ui, -apple-system, sans-serif !important;',
        '}',

        // Display serif for headings — Fraunces (PP Eiko stand-in)
        'h1, h2, h3, .display, [class*="PageTitle"], [class*="Heading"], [class*="heading"], [class*="Title"] {',
        '  font-family: "Fraunces", "PP Eiko", Georgia, "Times New Roman", serif !important;',
        '  font-weight: 500 !important;',
        '  letter-spacing: -0.01em !important;',
        '}',

        // Monospaced microcopy — IBM Plex Mono
        'code, pre, kbd, samp, time, [class*="Timestamp"], [class*="timestamp"], [class*="Badge"], [class*="badge"], [class*="Chip"], [class*="chip"], [class*="Eyebrow"] {',
        '  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace !important;',
        '  letter-spacing: 0.02em !important;',
        '}',

        // Text-color rule — soft ink for body, cream on dark surfaces
        'body, p, li, label, dt, dd { color: #1c1c18 !important; }',
        'a { color: #391d3a !important; }',
        'a:hover { color: #513351 !important; }',
        '[class*="BrandButton"], .button--primary, button[data-variant="primary"] { color: #fcf9f2 !important; }',
      ].join('\\n');

      function ensureStyle() {
        if (document.getElementById('rionna-theme')) return;
        var s = document.createElement('style');
        s.id = 'rionna-theme';
        s.textContent = css;
        // Append last so it cascades after Circle's own styles.
        document.head.appendChild(s);
      }

      ensureStyle();

      // Re-append if Circle's SPA removes our <style> from <head>.
      if (window.MutationObserver) {
        new MutationObserver(ensureStyle).observe(document.head, { childList: true });
      }

      // Belt-and-braces: also push tokens onto the inline style of <html>.
      // If a future Circle build adds !important to its inline tokens, this
      // line at least matches the priority.
      try {
        var tokens = css.match(/--[a-z0-9-]+:\\s*[^;]+!important/gi) || [];
        tokens.forEach(function(decl) {
          var colon = decl.indexOf(':');
          var name = decl.slice(0, colon).trim();
          var value = decl.slice(colon + 1).replace(/!important/i, '').trim();
          document.documentElement.style.setProperty(name, value, 'important');
        });
      } catch (e) {}

      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'rionna-theme',
          applied: !!document.getElementById('rionna-theme'),
          url: window.location.href,
        }));
      }
    } catch (e) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'rionna-theme-error',
          message: String(e && e.message ? e.message : e),
        }));
      }
    }
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
  const hasAuthedSession
    = communityUrl?.includes('/session/cookies?access_token=')
      || communityUrl?.includes('/__mock/ui/mobile-entry?access_token=')
      || false;

  const handleNavStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (!hasAuthedSession)
        return;
      if (
        navState.url.includes('/session/expired')
        || navState.url.includes('state=expired')
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
      <View style={{ flex: 1, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf9f2' }}>
        <ActivityIndicator size="large" color="#391d3a" />
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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#fcf9f2' }}>
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
          // Re-inject the theme on every full load so SPA navigations that
          // replace <head> or bypass `injectedJavaScript` still get branded.
          webviewRef.current?.injectJavaScript(CIRCLE_CSS_OVERRIDES);
        }}
        onMessage={(e) => {
          console.log('[CommunityWebView] message', e.nativeEvent.data);
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
          className="absolute inset-0 items-center justify-center bg-background/80"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#391d3a" />
        </View>
      )}
    </View>
  );
}
