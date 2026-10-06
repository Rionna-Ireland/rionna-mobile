/**
 * Pure digit diffing for `NumberRoll` (S14-02 §3). A value is split into text
 * runs and digit runs ("37 going" → "", "37", " going"). Two values can roll
 * when their text runs match; digit runs are compared right-aligned so units
 * line up with units (9 → 10 rolls the 9 into a 0 and brings in a new 1).
 */

/** A digit column's `''` side means the column appears/disappears. */
export type RollSegment = { kind: 'text'; text: string } | { kind: 'digit'; from: string; to: string };

const DIGIT_RUNS = /(\d+)/;

/**
 * Per-column segments from `from` to `to`, or `null` when the text around the
 * numbers changed (then the caller just swaps the value, no roll).
 */
export function diffRoll(from: string, to: string): RollSegment[] | null {
  const a = from.split(DIGIT_RUNS);
  const b = to.split(DIGIT_RUNS);
  if (a.length !== b.length)
    return null;
  const segments: RollSegment[] = [];
  for (let i = 0; i < b.length; i++) {
    const before = a[i] ?? '';
    const after = b[i] ?? '';
    if (i % 2 === 0) {
      if (before !== after)
        return null;
      if (after)
        segments.push({ kind: 'text', text: after });
      continue;
    }
    const width = Math.max(before.length, after.length);
    for (let col = 0; col < width; col++) {
      segments.push({
        kind: 'digit',
        from: before[col - (width - before.length)] ?? '',
        to: after[col - (width - after.length)] ?? '',
      });
    }
  }
  return segments;
}

/** True when at least one digit column changes. */
export function hasRoll(segments: RollSegment[] | null): segments is RollSegment[] {
  return segments !== null && segments.some(s => s.kind === 'digit' && s.from !== s.to);
}

/**
 * Roll direction: `1` when the first number that differs went up (old digits
 * leave upwards, new ones arrive from below), `-1` when it went down.
 */
export function rollDirection(from: string, to: string): 1 | -1 {
  const a = from.match(/\d+/g) ?? [];
  const b = to.match(/\d+/g) ?? [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number(a[i] ?? 0);
    const y = Number(b[i] ?? 0);
    if (x !== y)
      return y > x ? 1 : -1;
  }
  return 1;
}
