/**
 * Press-feedback guard (S14-08 A-010): every tappable under `src/features` and
 * `src/components` gives S14 press feedback through `MotionPressable` (scale +
 * Android ripple) or a primitive built on it (Button, Card, Chip, ListRow…).
 *
 * Fails on:
 * - raw `<Pressable` / `<TouchableOpacity` / `<TouchableHighlight` JSX, whether
 *   imported from `react-native` or the `@/components/ui` re-export;
 * - opacity-only pressed styles: `style={({ pressed }) => …}`.
 *
 * Deliberately silent surfaces (dismiss backdrops) use
 * `TouchableWithoutFeedback`, which says so in its name.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC = path.resolve(__dirname, '../..');
const ROOTS = ['features', 'components'];

/**
 * Files still waiting on their swap. ONLY files owned by the parallel S14-08
 * part B (member-content, community-posting, polls); shrink it as they land and
 * never add to it.
 */
const PRESS_ALLOWLIST = new Set<string>([
  'features/community-posting/components/compose-image-row.tsx',
  'features/community-posting/components/post-overflow-menu.tsx',
  'features/community-posting/components/report-sheet.tsx',
  'features/member-content/components/circle-embed-block.tsx',
  'features/member-content/components/circle-file-block.tsx',
  'features/member-content/components/featured-card.tsx',
  'features/member-content/components/like-toggle.tsx',
  'features/member-content/components/member-feed-card.tsx',
  'features/member-content/screens/member-post-screen.tsx',
  'features/polls/components/poll-card.tsx',
]);

const RAW_PRESSABLE = /<(?:Pressable|TouchableOpacity|TouchableHighlight)\b/;
const PRESSED_STYLE = /\(\s*\{\s*pressed\s*\}\s*\)\s*=>/;

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__snapshots__')
        sourceFiles(full, acc);
    }
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function files(): { rel: string; text: string }[] {
  return ROOTS.flatMap(root => sourceFiles(path.join(SRC, root))).map(file => ({
    rel: path.relative(SRC, file).split(path.sep).join('/'),
    text: fs.readFileSync(file, 'utf8'),
  }));
}

function offends(text: string): boolean {
  return RAW_PRESSABLE.test(text) || PRESSED_STYLE.test(text);
}

describe('press feedback guard', () => {
  it('has no raw Pressable/Touchable or pressed-opacity styles outside the allow-list', () => {
    const hits = files()
      .filter(f => !PRESS_ALLOWLIST.has(f.rel))
      .flatMap(f => f.text.split('\n').flatMap((line, i) =>
        RAW_PRESSABLE.test(line) || PRESSED_STYLE.test(line) ? [`${f.rel}:${i + 1}: ${line.trim()}`] : []));
    expect(hits).toEqual([]);
  });

  it('keeps the allow-list honest (every entry exists and still offends)', () => {
    const byRel = new Map(files().map(f => [f.rel, f.text]));
    for (const rel of PRESS_ALLOWLIST) {
      const text = byRel.get(rel);
      expect({ rel, exists: text !== undefined }).toEqual({ rel, exists: true });
      expect({ rel, offends: offends(text!) }).toEqual({ rel, offends: true });
    }
  });

  it('catches the patterns it claims to', () => {
    for (const line of [
      '<Pressable onPress={go}>',
      '    <TouchableOpacity',
      '<TouchableHighlight underlayColor="red">',
    ])
      expect({ line, hit: RAW_PRESSABLE.test(line) }).toEqual({ line, hit: true });
    expect(PRESSED_STYLE.test('style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}')).toBe(true);
    for (const line of ['<MotionPressable size="small">', '<AnimatedPressable', '<TouchableWithoutFeedback onPress={close}>'])
      expect({ line, hit: RAW_PRESSABLE.test(line) }).toEqual({ line, hit: false });
  });
});
