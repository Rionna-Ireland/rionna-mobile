import * as SplashScreen from 'expo-splash-screen';

let hidden = false;

/**
 * Hide the native splash once (S14-04 §2). The native splash is a blank
 * white, identical to the Arrival overlay's first frame (the mark at
 * progress 0), so there's nothing to fade. Never throws.
 */
export function hideNativeSplash(): void {
  if (hidden)
    return;
  hidden = true;
  try {
    SplashScreen.hideAsync().catch(() => {});
  }
  catch {}
}
