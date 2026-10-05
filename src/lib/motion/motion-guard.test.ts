/**
 * Motion token guards (S14-01 "CI grep check", S14-00 Done when): the motion
 * tokens file is the only source of durations, springs and haptics.
 *
 * 1. `expo-haptics` is imported only by `src/lib/motion/haptics.ts`.
 * 2. No raw animation numbers outside `src/lib/motion` and the motion
 *    primitives: no `withTiming(…, { duration: 300 })`, no spring physics
 *    literals in `withSpring(…)`, no `withDelay(120, …)`, no layout-animation
 *    `.duration(200)` / `.delay(80)`, and no `duration: <n>` literal in any file
 *    that animates (imports Reanimated or Moti). Use `@/lib/motion` tokens.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC = path.resolve(__dirname, '../..');

const HAPTICS_OWNER = 'lib/motion/haptics.ts';

/** Directories/files that define motion and may hold raw values. */
const MOTION_OWNERS = ['lib/motion/', 'components/ui/pressable.tsx'];

/**
 * Pre-S14 offenders, allowed until S14-02 moves them onto tokens. Remove each
 * entry as it's migrated; never add new ones.
 */
const RAW_MOTION_ALLOWLIST = new Set([
  // migrate in S14-02: spinner rotation `withTiming(360, { duration: 900 })`
  'features/arrival/welcome-spinner.tsx',
  // migrate in S14-02: fill/thumb `TIMING = { duration: 250 }`
  'components/ui/progress-bar.tsx',
  // migrate in S14-02: backdrop `FadeIn.duration(50)` / `FadeOut.duration(20)`
  'components/ui/modal.tsx',
  // migrate in S14-02: Moti transitions `{ type: 'timing', duration: 100 }`
  'components/ui/checkbox.tsx',
]);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__snapshots__' && entry.name !== 'node_modules')
        sourceFiles(full, acc);
    }
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function files(): { rel: string; text: string }[] {
  return sourceFiles(SRC).map(file => ({
    rel: path.relative(SRC, file).split(path.sep).join('/'),
    text: fs.readFileSync(file, 'utf8'),
  }));
}

function hitsIn(rel: string, text: string, pattern: RegExp): string[] {
  const hits: string[] = [];
  text.split('\n').forEach((line, i) => {
    if (pattern.test(line))
      hits.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
  return hits;
}

const HAPTICS_IMPORT = /(?:from\s+|require\(\s*|import\(\s*)['"]expo-haptics['"]/;

const NUM = String.raw`\d[\d_.]*`;
const PHYSICS = String.raw`(?:duration|delay|stiffness|damping|dampingRatio|mass)`;
const RAW_ANIMATION = new RegExp(
  [
    // withTiming / withSpring with an inline numeric config
    String.raw`with(?:Timing|Spring)\([^;]*\{[^}]*\b${PHYSICS}\s*:\s*${NUM}`,
    // withDelay(120, …)
    String.raw`withDelay\(\s*${NUM}`,
    // layout animation builders: FadeIn.duration(200), .delay(80), .springify().damping(12)
    String.raw`\.(?:duration|delay|damping|stiffness|mass)\(\s*${NUM}`,
  ].join('|'),
);
/** In a file that animates, any `duration: 250`-style literal (configs hoisted to a const). */
const RAW_DURATION_LITERAL = new RegExp(String.raw`\b${PHYSICS}\s*:\s*${NUM}`);
const ANIMATES = /from\s+['"](?:react-native-reanimated|moti)['"]/;

function isMotionOwner(rel: string) {
  return MOTION_OWNERS.some(owner => rel === owner || rel.startsWith(owner));
}

describe('motion guards', () => {
  it('imports expo-haptics only from src/lib/motion/haptics.ts', () => {
    const hits = files()
      .filter(f => f.rel !== HAPTICS_OWNER)
      .flatMap(f => hitsIn(f.rel, f.text, HAPTICS_IMPORT));
    expect(hits).toEqual([]);
  });

  it('has no raw animation durations/springs outside the motion tokens and primitives', () => {
    const hits = files()
      .filter(f => !isMotionOwner(f.rel) && !RAW_MOTION_ALLOWLIST.has(f.rel))
      .flatMap(f => [
        ...hitsIn(f.rel, f.text, RAW_ANIMATION),
        ...(ANIMATES.test(f.text) ? hitsIn(f.rel, f.text, RAW_DURATION_LITERAL) : []),
      ]);
    expect([...new Set(hits)]).toEqual([]);
  });

  it('keeps the allow-list honest (every entry still offends)', () => {
    const byRel = new Map(files().map(f => [f.rel, f.text]));
    for (const rel of RAW_MOTION_ALLOWLIST) {
      const text = byRel.get(rel);
      expect(text).toBeDefined();
      const offends = RAW_ANIMATION.test(text!) || (ANIMATES.test(text!) && RAW_DURATION_LITERAL.test(text!));
      expect({ rel, offends }).toEqual({ rel, offends: true });
    }
  });

  it('catches the patterns it claims to', () => {
    for (const line of [
      'x.value = withTiming(1, { duration: 300 });',
      'withSpring(0, { damping: 12, stiffness: 200 })',
      'withSpring(0, { dampingRatio: 0.8 })',
      'withDelay(120, withTiming(1))',
      'entering={FadeIn.duration(200)}',
      'entering={FadeInDown.delay(80)}',
    ])
      expect({ line, hit: RAW_ANIMATION.test(line) }).toEqual({ line, hit: true });
    for (const line of [
      'withTiming(1, timings.enter)',
      'withSpring(1, springs.snappy)',
      'withTiming(1, { duration: durations.quick })',
      'withDelay(staggerDelay(i), withTiming(1))',
    ])
      expect({ line, hit: RAW_ANIMATION.test(line) }).toEqual({ line, hit: false });
    expect(HAPTICS_IMPORT.test(`import * as Haptics from 'expo-haptics';`)).toBe(true);
    expect(HAPTICS_IMPORT.test(`const H = require('expo-haptics');`)).toBe(true);
  });
});
