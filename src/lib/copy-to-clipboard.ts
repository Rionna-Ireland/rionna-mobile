import type * as ClipboardType from 'expo-clipboard';

// Lazy-require so a dev client built before expo-clipboard was added doesn't
// crash the importing screen. Mirrors src/lib/open-external-link.ts.
let Clipboard: typeof ClipboardType | null = null;
try {
  Clipboard = require('expo-clipboard');
}
catch {
  Clipboard = null;
}

/** Copies text; resolves false when the native module is unavailable. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!Clipboard)
    return false;
  try {
    await Clipboard.setStringAsync(text);
    return true;
  }
  catch {
    return false;
  }
}
