import type * as HapticsType from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics vocabulary (S14-01 §3). This file is the ONLY importer of
 * `expo-haptics` (enforced by `motion-guard.test.ts`). Light and rare: never on
 * scroll, navigation or refresh. Haptics are not motion, so they stay on under
 * Reduce Motion.
 *
 * The native module is required lazily on first use (never at import time:
 * top-level TurboModule access crashes under the New Architecture), cached, and
 * a missing module (old dev client) degrades to a silent no-op. Every call is
 * fire-and-forget: rejections are swallowed.
 *
 * iOS: the standard UIKit generators (respect the system haptics setting).
 * Android: `performAndroidHapticsAsync` (View.performHapticFeedback, which
 * respects the system touch-feedback setting) with the Material constant for
 * each intent; when the constant isn't available on the device's API level it
 * falls back to the equivalent standard call.
 */

/**
 * Android `tap()` switch. Tom's A50 QA call (S14-00): if Light taps feel buzzy
 * on the A50, flip this to `false` so only selection/success/warning/land
 * remain on Android. iOS is unaffected.
 */
export const ANDROID_TAP_HAPTICS = true;

type HapticsModule = typeof HapticsType;

let cached: HapticsModule | null | undefined;

function haptics(): HapticsModule | null {
  if (cached !== undefined)
    return cached;
  try {
    cached = require('expo-haptics') as HapticsModule;
  }
  catch {
    cached = null;
  }
  return cached;
}

function noop() {}

function fire(run: () => Promise<unknown> | undefined) {
  try {
    void run()?.catch(noop);
  }
  catch {
    // Native call threw synchronously (module half-linked): stay silent.
  }
}

type AndroidKey = keyof typeof HapticsType.AndroidHaptics;

/**
 * Fire `android` on Android (falling back to `standard` when the constant
 * isn't supported at this API level), `standard` everywhere else.
 */
function play(android: AndroidKey, standard: (h: HapticsModule) => Promise<void>) {
  const h = haptics();
  if (!h)
    return;
  if (Platform.OS === 'android' && h.performAndroidHapticsAsync && h.AndroidHaptics) {
    fire(() => h.performAndroidHapticsAsync(h.AndroidHaptics[android]).catch(() => standard(h)));
    return;
  }
  fire(() => standard(h));
}

/** Chips, tabs, toggles, segmented controls. */
export function selection() {
  play('Clock_Tick', h => h.selectionAsync());
}

/** Primary buttons, like, follow. No-op on Android when `ANDROID_TAP_HAPTICS` is off. */
export function tap() {
  if (Platform.OS === 'android' && !ANDROID_TAP_HAPTICS)
    return;
  play('Virtual_Key', h => h.impactAsync(h.ImpactFeedbackStyle.Light));
}

/** Vote cast, RSVP, Remind-me on, follow confirmed. */
export function success() {
  play('Confirm', h => h.notificationAsync(h.NotificationFeedbackType.Success));
}

/** A destructive confirm. */
export function warning() {
  play('Reject', h => h.notificationAsync(h.NotificationFeedbackType.Warning));
}

let landed = false;

/** The splash fill moment. Plays at most once per JS session (launch). */
export function land() {
  if (landed)
    return;
  landed = true;
  play('Gesture_End', h => h.impactAsync(h.ImpactFeedbackStyle.Soft));
}

export const haptic = { selection, tap, success, warning, land } as const;

export type HapticIntent = Exclude<keyof typeof haptic, 'land'>;

/** Test-only: forget the cached module and the once-per-launch `land()` latch. */
export function __resetHapticsForTests() {
  cached = undefined;
  landed = false;
}
