import { requireOptionalNativeModule } from 'expo-modules-core';

export type CircleCookiesModule = {
  /**
   * Clear the live WebView cookie store — `WKHTTPCookieStore` on iOS,
   * `CookieManager.removeAllCookies` on Android. Resolves once the native
   * removal has finished.
   */
  clearWebViewCookies: () => Promise<void>;
};

// Local Expo module (modules/circle-cookies, S6-04 Option B). iOS + Android.
// `requireOptional…` returns null before a native rebuild has linked it, so
// callers must null-check — the cookie clear then degrades to a no-op rather
// than crashing logout.
const CircleCookies = requireOptionalNativeModule<CircleCookiesModule>('CircleCookies');

export default CircleCookies;
