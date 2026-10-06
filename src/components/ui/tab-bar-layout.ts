import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Design V2 floating tab bar metrics (S13-01 §8, Figma "tab bar" node 5:201).
 * The pill is 350×60 and sits ~20pt above the home indicator, which on
 * notched iPhones is the bottom safe-area inset.
 */
export const TAB_BAR_WIDTH = 350;
export const TAB_BAR_HEIGHT = 60;
/** Side margin when the screen is narrower than 350 + 2×this. */
export const TAB_BAR_MIN_SIDE_MARGIN = 16;

/** Minimum offset from the screen bottom on devices with no bottom inset. */
const TAB_BAR_MIN_BOTTOM_OFFSET = 16;

/**
 * Inner vertical size of the pill. Full-bleed screens must pad by at least
 * this plus the bottom offset so content clears the floating bar.
 */
export const CUSTOM_TAB_BAR_INNER_HEIGHT = TAB_BAR_HEIGHT;

/** Bottom offset for the floating tab pill. */
export function useTabBarBottomOffset(): number {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, TAB_BAR_MIN_BOTTOM_OFFSET);
}

/** Scroll content padding so the last item clears the floating tab pill. */
export function useTabBarContentPadding(extra = 24): number {
  return useTabBarBottomOffset() + CUSTOM_TAB_BAR_INNER_HEIGHT + extra;
}

/** Pill padding and border (Figma 5:201): 7pt top/bottom, 17.6pt sides, 1pt border. */
export const TAB_BAR_PADDING_X = 17.6;
export const TAB_BAR_PADDING_Y = 7;
export const TAB_BAR_BORDER = 1;
/** Regular tab hit target / active circle diameter. */
export const TAB_SIZE = 44;
/** Community centre button diameter. */
export const TAB_CENTRE_SIZE = 52;

/**
 * Left edge (pt, relative to the pill's padding box, which is where absolute
 * children are positioned) of a 44pt circle centred on each tab slot. Slots
 * are laid out `justify-between` inside the padded pill, so the gap between
 * them is whatever width is left over. The active circle slides between
 * these offsets (S14-02 §2).
 */
export function tabIndicatorOffsets(barWidth: number, slotWidths: readonly number[]): number[] {
  const inner = barWidth - TAB_BAR_PADDING_X * 2 - TAB_BAR_BORDER * 2;
  const used = slotWidths.reduce((sum, w) => sum + w, 0);
  const gap = slotWidths.length > 1 ? Math.max(0, inner - used) / (slotWidths.length - 1) : 0;
  const offsets: number[] = [];
  let x = TAB_BAR_PADDING_X;
  for (const w of slotWidths) {
    offsets.push(x + w / 2 - TAB_SIZE / 2);
    x += w + gap;
  }
  return offsets;
}

/**
 * How "under the circle" a tab is (0–1) for an indicator at `indicatorX`:
 * 1 when centred on the tab's offset, fading to 0 one slot `spacing` away.
 * Drives the icon cross-colour while the circle slides.
 */
export function tabActiveness(indicatorX: number, slotX: number, spacing: number): number {
  'worklet';
  if (spacing <= 0)
    return indicatorX === slotX ? 1 : 0;
  return Math.min(1, Math.max(0, 1 - Math.abs(indicatorX - slotX) / spacing));
}
