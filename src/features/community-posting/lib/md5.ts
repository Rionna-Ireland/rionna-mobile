/** Converts a hex digest to base64 (the form S3's Content-MD5 / Circle's `checksum` expect). */
export function hexToBase64(hex: string): string {
  let binary = '';
  for (let i = 0; i < hex.length; i += 2) {
    binary += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
  }
  return btoa(binary);
}

/**
 * Base64 MD5 and byte size of a file on disk. The size comes from disk, not the
 * picker: picker sizes can be 0 or pre-transcode, and S3 signs the exact length. Uses the async legacy `getInfoAsync` (native
 * hashing off the JS thread, no whole-file read) so a 200 MB video doesn't
 * freeze the composer — the sync `new File(uri).md5` would. Lazily required:
 * never touch native modules at module top level (New Architecture).
 */
export async function fileDigest(uri: string): Promise<{ checksum: string; byteSize: number }> {
  const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  const info = await FileSystem.getInfoAsync(uri, { md5: true });
  if (!info.exists || !info.md5 || !info.size) {
    throw new Error('Could not hash file');
  }
  return { checksum: hexToBase64(info.md5), byteSize: info.size };
}
