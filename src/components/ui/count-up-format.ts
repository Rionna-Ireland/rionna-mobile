/**
 * Worklet-safe whole-euro formatting for `CountUp` (S14-06). Matches
 * `Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR',
 * maximumFractionDigits: 0 })` exactly (see the test), without building an
 * Intl formatter on the UI thread every frame.
 */

export const EURO_SIGN = '€';

/** 24500 → "24,500" (rounded, never negative). */
export function groupWhole(n: number): string {
  'worklet';
  const digits = String(Math.max(0, Math.round(n)));
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0)
      out += ',';
    out += digits[i];
  }
  return out;
}

/** 24500 → "€24,500". */
export function formatEuroWhole(n: number): string {
  'worklet';
  return `${EURO_SIGN}${groupWhole(n)}`;
}

/**
 * The character in slot `k`, counting from the right of the grouped body
 * ("" when the number is too short to reach it). Grouping runs from the
 * right, so a shorter count's commas line up with the target's slots.
 */
export function slotChar(body: string, k: number): string {
  'worklet';
  const i = body.length - 1 - k;
  return i >= 0 ? body.charAt(i) : '';
}

export type CountUpSlot = { k: number; kind: 'digit' | 'comma' };

/** Slots for the target's grouped body, left to right ("24,500" → 6 slots, k 5…0). */
export function countUpSlots(target: number): CountUpSlot[] {
  const body = groupWhole(target);
  return body.split('').map((ch, i) => ({ k: body.length - 1 - i, kind: ch === ',' ? 'comma' : 'digit' }));
}
