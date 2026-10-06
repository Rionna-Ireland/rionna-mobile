import { SUBMARK_VIEWBOX, WORDMARK_LETTERS_X, WORDMARK_VIEWBOX } from '@/components/brand/logo';
import { submarkHeightFor } from '@/components/brand/logo/animated-submark-math';

/**
 * Pure layout maths for the Arrival overlay (S14-04 §4–5). All rects are in
 * window coordinates (the overlay fills the window; slots report
 * `measureInWindow`).
 */

export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

/** The mark's size while it draws on a cold launch (pt wide). */
export const ARRIVAL_MARK_SIZE = 80;
/** The welcome frame's mark (S13-02 frame 4): 52pt wide, 100pt from the top. */
export const WELCOME_MARK_SIZE = 52;
export const WELCOME_MARK_TOP = 100;
/** The signed-out lockup (frame 1) is the 212pt-wide wordmark. */
export const LOCKUP_WIDTH = 212;

/** A submark rect `width` wide, centred in the window. */
export function centredMarkRect(window: Size, width: number = ARRIVAL_MARK_SIZE): Rect {
  const height = submarkHeightFor(width);
  return { x: (window.width - width) / 2, y: (window.height - height) / 2, width, height };
}

/** The welcome frame's mark: centred horizontally, `WELCOME_MARK_TOP` down. */
export function welcomeMarkRect(window: Size): Rect {
  const height = submarkHeightFor(WELCOME_MARK_SIZE);
  return { x: (window.width - WELCOME_MARK_SIZE) / 2, y: WELCOME_MARK_TOP, width: WELCOME_MARK_SIZE, height };
}

/**
 * The centred lockup: where the head sits (the mark settles there) and where
 * the letters go, so mark + letters read as the one wordmark.
 */
export function lockupRects(window: Size, width: number = LOCKUP_WIDTH): { head: Rect; letters: Rect } {
  const k = width / WORDMARK_VIEWBOX.width;
  const height = WORDMARK_VIEWBOX.height * k;
  const x = (window.width - width) / 2;
  const y = (window.height - height) / 2;
  const headWidth = SUBMARK_VIEWBOX.width * k;
  const lettersX = x + WORDMARK_LETTERS_X * k;
  return {
    head: { x, y, width: headWidth, height },
    letters: { x: lettersX, y, width: x + width - lettersX, height },
  };
}

export type FlightTransform = { translateX: number; translateY: number; scale: number };

export const IDENTITY: FlightTransform = { translateX: 0, translateY: 0, scale: 1 };

/**
 * Transform that takes a view laid out at `from` onto `to` (centre-to-centre
 * translate + uniform scale by width; RN scales about the view's centre).
 */
export function flightTransform(from: Rect, to: Rect): FlightTransform {
  if (from.width <= 0)
    return IDENTITY;
  return {
    translateX: to.x + to.width / 2 - (from.x + from.width / 2),
    translateY: to.y + to.height / 2 - (from.y + from.height / 2),
    scale: to.width / from.width,
  };
}

/** A measured rect is usable as a hand-off target (on screen, non-zero). */
export function isUsableRect(rect: Rect | null | undefined, window: Size): rect is Rect {
  if (!rect || rect.width <= 0 || rect.height <= 0)
    return false;
  return rect.x + rect.width > 0 && rect.y + rect.height > 0 && rect.x < window.width && rect.y < window.height;
}
