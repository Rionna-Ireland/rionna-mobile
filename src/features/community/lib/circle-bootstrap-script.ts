// Single source of truth for the Circle cookie-install bootstrap script.
//
// S0-03 approach C: bootstrap cookies by running the fetch from inside the
// WebView's own JS context. This works around the native-module New-Arch
// incompatibility of @react-native-cookies/cookies. Same-origin fetch means
// Circle's Set-Cookie headers install first-party into WKHTTPCookieStore
// without any native bridge.
//
// The bootstrap page is `/mobile-login` on the community origin — a Circle
// Custom Page that does NOT redirect (unlike `/`, `/users/sign_in`, etc.), so
// `onLoadEnd` fires on the community origin and we get a JS context to inject
// into. The user never sees it: the visible CommunityWebView hides it via
// `visibility: hidden` and `window.location.replace(postBootstrapPath)` as
// soon as the fetch resolves. The offscreen pre-warm WebView (S6-03 B4) reuses
// this exact script: it only needs the cookie-install side effect, so it can
// point `postBootstrapPath` anywhere on-origin (it never paints).
//
// This script is delivered via `injectedJavaScriptBeforeContentLoaded` so it
// runs BEFORE the bootstrap HTML renders.
//
// @see Architecture/specs/S0-03-circle-cookie-auth.md §"Implementation deltas"
// @see Architecture/specs/S6-03-community-prewarm.md

/**
 * Builds the injected bootstrap script that POSTs `/api/headless/v1/cookies`
 * with the Circle headless JWT to install first-party cookies, then redirects
 * to `postBootstrapPath`. Used by both the visible Community WebView and the
 * offscreen pre-warm WebView so there is exactly one source of truth.
 */
export function buildBootstrapScript(
  accessToken: string,
  postBootstrapPath: string,
): string {
  // JWTs are base64url-ish but escape defensively.
  const safeToken = accessToken.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
  const safePath = postBootstrapPath.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
  return `
    (function () {
      try {
        var postMsg = function (payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        };

        // Determine where we are. The bootstrap page (/mobile-login) is the
        // only place we ever want to take action — on any other Circle page
        // we're either mid-navigation or already landed, nothing to do.
        // Do NOT include the post-bootstrap path here: landing on it is
        // exactly where we want the script to no-op.
        var path = window.location && window.location.pathname
          ? window.location.pathname
          : '';
        var onBootstrapPage = path === '/mobile-login'
          || path === '/mobile-login/';

        if (!onBootstrapPage) {
          // We're on a downstream page (e.g. /feed). Let Circle render it.
          postMsg({ type: 'rionna-cookies-bootstrap-noop', path: path });
          return;
        }

        // Hide the bootstrap page while we work so it never paints.
        var ensureHidden = function () {
          try {
            if (document.documentElement) {
              document.documentElement.style.visibility = 'hidden';
              document.documentElement.style.backgroundColor = '#fcf9f2';
            }
          } catch (_) {}
        };
        ensureHidden();
        if (document.addEventListener) {
          document.addEventListener('DOMContentLoaded', ensureHidden, { once: true });
        }

        // Always POST the cookie-install fetch with the CURRENT member's token —
        // never skip on "cookies already present". The old presence check
        // (skip_confirmed_password in document.cookie) was user-AGNOSTIC, so any
        // cookie left over from a previous member made this page load as that
        // member (the cross-user §E leak, S6-04). Circle's endpoint overwrites
        // the session cookies, so always re-fetching is the defence-in-depth
        // that makes login freshness independent of the native cookie clear
        // being byte-perfect.

        // Session-level guard for concurrent navigations within the same
        // WKWebView instance. sessionStorage persists across same-WebView
        // navigations, so this prevents two bootstraps racing.
        try {
          if (sessionStorage.getItem('__rionna_bootstrap_in_flight')) {
            return;
          }
          sessionStorage.setItem('__rionna_bootstrap_in_flight', '1');
        } catch (_) {}

        postMsg({ type: 'rionna-cookies-bootstrap-start' });

        fetch('/api/headless/v1/cookies', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + '${safeToken}' },
          credentials: 'include',
        }).then(function (res) {
          try { sessionStorage.removeItem('__rionna_bootstrap_in_flight'); } catch (_) {}
          postMsg({ type: 'rionna-cookies-bootstrap', status: res.status, ok: res.ok });
          if (res.ok) {
            // Replace not assign so the bootstrap URL doesn't linger in history.
            window.location.replace('${safePath}');
          } else {
            if (document.documentElement) document.documentElement.style.visibility = '';
          }
        }).catch(function (err) {
          try { sessionStorage.removeItem('__rionna_bootstrap_in_flight'); } catch (_) {}
          postMsg({ type: 'rionna-cookies-bootstrap-error', message: String(err && err.message ? err.message : err) });
          if (document.documentElement) document.documentElement.style.visibility = '';
        });
      } catch (err) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'rionna-cookies-bootstrap-error',
            message: String(err && err.message ? err.message : err),
          }));
        }
      }
    })();
    true;
  `;
}

/**
 * True for any of the terminal bootstrap postMessages — the signal that the
 * cookie-install attempt has finished (success, skip, no-op, or error).
 * Both the visible WebView and the offscreen pre-warm WebView use this to
 * know when the bootstrap has run to completion.
 */
export function isTerminalBootstrapMessage(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const message = payload as { ok?: boolean; type?: string };
  const { type } = message;

  return (
    type === 'rionna-cookies-bootstrap-noop'
    || type === 'rionna-cookies-bootstrap-skipped'
    || type === 'rionna-cookies-bootstrap-error'
    || (type === 'rionna-cookies-bootstrap' && typeof message.ok === 'boolean')
  );
}
