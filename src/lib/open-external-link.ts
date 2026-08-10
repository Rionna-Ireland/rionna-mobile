import type * as WebBrowserType from 'expo-web-browser';

import { Linking } from 'react-native';

// Lazy-require so a missing native module (dev client not yet rebuilt)
// doesn't crash the importing screen. Falls back to Linking.openURL
// (system browser). Mirrors the pattern first used in
// src/features/settings/screens/profile-screen.tsx.
let WebBrowser: typeof WebBrowserType | null = null;
try {
  WebBrowser = require('expo-web-browser');
}
catch {
  WebBrowser = null;
}

/**
 * Opens an external URL in the app's in-app browser (expo-web-browser),
 * falling back to the system browser (Linking) if the native module isn't
 * available. Shared by any surface that opens a link outside the app --
 * settings legal links, replay links, etc.
 */
export function openExternalLink(url: string) {
  if (WebBrowser) {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  }
  else {
    Linking.openURL(url).catch(() => {});
  }
}
