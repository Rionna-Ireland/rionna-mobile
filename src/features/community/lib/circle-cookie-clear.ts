import CircleCookies from '../../../../modules/circle-cookies';

// S6-04 Option B. Option A (@react-native-cookies/cookies `clearAll(true)`) was
// verified NOT to load under Expo SDK 54 New Architecture on 2026-06-11 — the
// sign-out probe logged "Native cookie module NOT loaded" and the §E cross-user
// leak reproduced. We use a local Expo module instead (modules/circle-cookies,
// iOS + Android), which is TurboModule-based and links reliably under New Arch.

export type CircleCookieClearResult
  = | 'cleared' // native cookie removal resolved
    | 'module-missing' // native module not loaded (before a native rebuild)
    | 'failed'; // module loaded but the call threw

/**
 * Clear the LIVE WebView session on sign-out (S6-04).
 *
 * Despite the name, the native call clears cookies AND all web storage
 * (localStorage / IndexedDB / caches): Circle is a SPA that persists the member
 * session outside cookies, and clearing only cookies left the cross-user §E
 * leak open (verified on-device 2026-06-11). The native side deletes cookies
 * individually via WKHTTPCookieStore (reliable, unlike removeData(modifiedSince:))
 * plus all website-data records, so a different member signing in WITHIN the
 * same app instance starts from a clean Circle session — no restart required.
 *
 * Best-effort: every failure is swallowed + logged. It must never block logout.
 * The returned status is for the caller's log line (and the S6-04 device test).
 */
export async function clearCircleWebViewCookies(): Promise<CircleCookieClearResult> {
  if (!CircleCookies || typeof CircleCookies.clearWebViewCookies !== 'function') {
    console.warn(
      '[circle] Native cookie module NOT loaded — live WebView cookies were not '
      + 'cleared. Rebuild the dev client (the local modules/circle-cookies module '
      + 'links on prebuild, iOS + Android).',
    );
    return 'module-missing';
  }

  try {
    await CircleCookies.clearWebViewCookies();
    console.log('[circle] Live WebView session cleared (cookies + web storage) — S6-04 OK.');
    return 'cleared';
  }
  catch (e) {
    console.warn('[circle] clearWebViewCookies threw (continuing logout):', e);
    return 'failed';
  }
}
