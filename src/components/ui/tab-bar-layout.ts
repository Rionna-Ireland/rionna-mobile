import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The floating pill sits down inside the bottom safe area, just above the
 * home indicator, rather than hovering a gap above the inset.
 */
const TAB_BAR_SAFE_AREA_OVERLAP = 16;

/** Minimum offset from the screen bottom on devices with no bottom inset. */
const TAB_BAR_MIN_BOTTOM_OFFSET = 8;

/**
 * Inner vertical size: `py-4` + row (`p-3` + 24px icon + `p-3`) + `py-4`.
 * Full-bleed screens must pad by at least this plus the bottom offset so
 * content clears the floating pill.
 */
export const CUSTOM_TAB_BAR_INNER_HEIGHT = 16 + (12 + 24 + 12) + 16;

/** Bottom offset for the floating tab pill (dips into the safe-area inset). */
export function useTabBarBottomOffset(): number {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom - TAB_BAR_SAFE_AREA_OVERLAP, TAB_BAR_MIN_BOTTOM_OFFSET);
}

/** Scroll content padding so the last item clears the floating tab pill. */
export function useTabBarContentPadding(extra = 24): number {
  return useTabBarBottomOffset() + CUSTOM_TAB_BAR_INNER_HEIGHT + extra;
}
