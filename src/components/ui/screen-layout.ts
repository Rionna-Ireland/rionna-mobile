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
