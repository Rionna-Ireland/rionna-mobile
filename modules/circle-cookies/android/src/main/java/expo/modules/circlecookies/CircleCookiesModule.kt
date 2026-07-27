package expo.modules.circlecookies

import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import android.webkit.WebStorage
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// S6-04 Option B (Android parity). Clears the live WebView session so a
// different member signing in within the SAME app instance starts clean — no
// app restart. Mirrors the iOS two-pronged clear:
//  1. CookieManager.removeAllCookies + flush — the process-global cookie store.
//  2. WebStorage.deleteAllData — localStorage / IndexedDB / WebSQL, where
//     Circle's SPA may persist the member session outside cookies.
// Run on the main thread; resolve once the async cookie removal callback fires.
class CircleCookiesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CircleCookies")

    AsyncFunction("clearWebViewCookies") { promise: Promise ->
      Handler(Looper.getMainLooper()).post {
        val cookieManager = CookieManager.getInstance()
        cookieManager.removeAllCookies {
          cookieManager.flush()
          WebStorage.getInstance().deleteAllData()
          promise.resolve(null)
        }
      }
    }
  }
}
