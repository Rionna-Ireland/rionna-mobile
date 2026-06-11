import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Keep in sync with `bottom-6` on CustomTabBar (default Tailwind spacing). */
export const CUSTOM_TAB_BAR_BOTTOM_GAP = 24;

/**
 * Inner vertical size: `py-4` + row (`p-3` + 24px icon + `p-3`) + `py-4`.
 * Full-bleed screens must pad by at least this plus `CUSTOM_TAB_BAR_BOTTOM_GAP`
 * so content clears the floating pill.
 */
export const CUSTOM_TAB_BAR_INNER_HEIGHT = 16 + (12 + 24 + 12) + 16;

/** Distance from the screen bottom to the top edge of the tab pill. */
export const CUSTOM_TAB_BAR_TOP_OFFSET_FROM_BOTTOM = CUSTOM_TAB_BAR_BOTTOM_GAP + CUSTOM_TAB_BAR_INNER_HEIGHT;

/** Bottom offset for the floating tab pill (gap + system nav/home inset). */
export function useTabBarBottomOffset(): number {
  const { bottom } = useSafeAreaInsets();
  return CUSTOM_TAB_BAR_BOTTOM_GAP + bottom;
}

/** Scroll content padding so the last item clears the floating tab pill. */
export function useTabBarContentPadding(extra = 24): number {
  const { bottom } = useSafeAreaInsets();
  return CUSTOM_TAB_BAR_TOP_OFFSET_FROM_BOTTOM + bottom + extra;
}
