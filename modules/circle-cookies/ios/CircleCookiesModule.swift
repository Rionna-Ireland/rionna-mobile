import ExpoModulesCore
import WebKit

// S6-04 Option B. A local Expo module (TurboModule-based, so it actually loads
// under Expo SDK 54 New Architecture — unlike @react-native-cookies/cookies,
// whose RNCookieManagerIOS resolved to undefined; see S0-03 / S6-04).
//
// Clears the LIVE WebView session so a different member signing in within the
// SAME app instance starts clean, with no app restart. The superseded hidden
// /users/sign_out flush only expired the on-disk cookies, leaving the live
// WKWebView session intact.
public class CircleCookiesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CircleCookies")

    // Three-pronged clear, all required:
    //  0. Clear HTTPCookieStorage.shared. react-native-webview's
    //     `sharedCookiesEnabled` mirrors WK cookies into the app-level shared
    //     storage and RE-INJECTS them on every load, so clearing only the WK
    //     store lets the previous member's cookies resurrect — the primary §E
    //     leak (S6-04). Synchronous.
    //  1. Delete each cookie via WKHTTPCookieStore. WKWebsiteDataStore
    //     .removeData(modifiedSince:) is known-flaky for cookies (it often
    //     leaves them behind) — iterating + deleting is the reliable path, and
    //     it covers Circle's HttpOnly session cookies.
    //  2. Remove ALL website data records (localStorage, IndexedDB, session
    //     storage, caches, service workers). Circle is a SPA and persists the
    //     member session outside cookies, so cookies alone are not enough.
    // WKWebsiteDataStore must be touched on the main thread.
    AsyncFunction("clearWebViewCookies") { (promise: Promise) in
      DispatchQueue.main.async {
        let dataStore = WKWebsiteDataStore.default()
        let group = DispatchGroup()

        // 0. App-level shared cookie storage + URL cache (synchronous).
        HTTPCookieStorage.shared.removeCookies(since: .distantPast)
        URLCache.shared.removeAllCachedResponses()

        // 1. Per-cookie delete.
        let cookieStore = dataStore.httpCookieStore
        group.enter()
        cookieStore.getAllCookies { cookies in
          if cookies.isEmpty {
            group.leave()
            return
          }
          let cookieGroup = DispatchGroup()
          for cookie in cookies {
            cookieGroup.enter()
            cookieStore.delete(cookie) { cookieGroup.leave() }
          }
          cookieGroup.notify(queue: .main) { group.leave() }
        }

        // 2. All website data records.
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        group.enter()
        dataStore.fetchDataRecords(ofTypes: types) { records in
          dataStore.removeData(ofTypes: types, for: records) {
            group.leave()
          }
        }

        group.notify(queue: .main) {
          promise.resolve(nil)
        }
      }
    }
  }
}
