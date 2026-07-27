import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top padding for full-bleed screens (no native header): status-bar /
 * Dynamic Island inset plus breathing room, so headers and heroes never
 * render under the system chrome.
 */
export function useScreenTopPadding(extra = 12): number {
  const { top } = useSafeAreaInsets();
  return top + extra;
}

/**
 * Bottom padding for controls pinned to the screen edge (composers, bars):
 * home-indicator inset so they never render under the system gesture area.
 */
export function useScreenBottomPadding(extra = 0): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + extra;
}
