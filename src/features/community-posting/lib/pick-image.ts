import type { PostImage } from '@/features/community-posting/types';

/**
 * Launches the native image picker and returns the selected image, or
 * `null` if the user cancels or denies photo-library permission.
 *
 * `expo-image-picker` is lazily required inside the function body — a
 * top-level import would touch the native module at module-eval time,
 * which crashes under the New Architecture (see feedback_rn_expo_module_init).
 */
export async function pickImage(): Promise<PostImage | null> {
  const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    exif: false,
    allowsMultipleSelection: false,
  });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) {
    return null;
  }
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileSize: asset.fileSize ?? 0,
  };
}
