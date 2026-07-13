import type { HydratedNode } from '../tiptap/hydrate';

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

type CircleEmbedBlockProps = {
  node: HydratedNode;
  onOpenUrl?: (url: string) => void;
};

type ResolvedEmbed = {
  html?: unknown;
  url?: unknown;
};

type ShouldStartRequest = {
  isTopFrame: boolean;
  url: string;
};

type OpenWindowEvent = {
  nativeEvent: { targetUrl: string };
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function safeExternalUrl(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text)
    return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? text : null;
  }
  catch {
    return null;
  }
}

function resolvedEmbed(node: HydratedNode): ResolvedEmbed | null {
  const value = node.attrs?._resolved;
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as ResolvedEmbed
    : null;
}

function embedDocument(fragment: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <meta http-equiv="Content-Security-Policy" content="default-src https: data: blob:; frame-src https:; img-src https: data: blob:; media-src https: blob:; script-src https: 'unsafe-inline'; style-src https: 'unsafe-inline'">
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f2f2f2; }
      iframe, video { border: 0; width: 100% !important; height: 100% !important; }
      img { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>${fragment}</body>
</html>`;
}

export function CircleEmbedBlock({ node, onOpenUrl }: CircleEmbedBlockProps) {
  const embed = resolvedEmbed(node);
  const html = nonEmptyString(embed?.html);
  const fallbackUrl = safeExternalUrl(embed?.url);

  const openExternal = React.useCallback((value: unknown) => {
    const url = safeExternalUrl(value);
    if (url && onOpenUrl)
      onOpenUrl(url);
  }, [onOpenUrl]);

  const shouldStart = React.useCallback((request: ShouldStartRequest) => {
    if (request.isTopFrame === false)
      return true;
    if (request.url === 'about:blank' || request.url.startsWith('data:text/html')) {
      return true;
    }
    openExternal(request.url);
    return false;
  }, [openExternal]);

  const onOpenWindow = React.useCallback((event: OpenWindowEvent) => {
    openExternal(event.nativeEvent.targetUrl);
  }, [openExternal]);

  if (html) {
    return (
      <View style={styles.frame}>
        <WebView
          testID="circle-embed-webview"
          allowsInlineMediaPlayback
          cacheEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          mediaPlaybackRequiresUserAction
          nestedScrollEnabled={false}
          originWhitelist={['about:blank', 'https://*']}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled={false}
          source={{ html: embedDocument(html) }}
          style={styles.webView}
          onOpenWindow={onOpenWindow}
          onShouldStartLoadWithRequest={shouldStart}
        />
      </View>
    );
  }

  if (fallbackUrl) {
    return (
      <Pressable
        accessibilityRole="link"
        disabled={!onOpenUrl}
        style={styles.fallback}
        onPress={() => openExternal(fallbackUrl)}
      >
        <Text style={styles.fallbackText}>View media</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.fallback}>
      <Text style={styles.unavailableText}>Media unavailable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#F2F2F2',
    borderColor: '#D9D9D9',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 220,
    overflow: 'hidden',
    width: '100%',
  },
  webView: {
    backgroundColor: '#F2F2F2',
    height: 220,
    width: '100%',
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderColor: '#D9D9D9',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 88,
    padding: 16,
  },
  fallbackText: {
    color: '#6D28D9',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  unavailableText: {
    color: '#6B6B6B',
    fontSize: 14,
  },
});
