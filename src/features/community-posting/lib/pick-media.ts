import type { MediaKind, PickedMedia } from '@/features/community-posting/types';

import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_VIDEO_BYTES,
  MAX_VIDEOS,
  VIDEO_TYPES,
} from '@/features/community-posting/lib/limits';
import { translate } from '@/lib/i18n';

export type PickMediaResult = { items: PickedMedia[]; error: string | null };

const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function normalizeMime(mime: string | null | undefined, uri: string): string {
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
  const raw = (mime ?? EXT_TYPES[ext] ?? '').toLowerCase();
  return raw === 'image/jpg' || raw === 'image/pjpeg' ? 'image/jpeg' : raw === 'image/heif' ? 'image/heic' : raw;
}

/**
 * Filters picked items against type, size and count limits (the backend
 * enforces the same again). Returns the accepted items plus the first
 * translated error, if anything was rejected.
 */
export function validateMedia(candidates: PickedMedia[], existing: PickedMedia[]): PickMediaResult {
  const count = (kind: MediaKind) => existing.filter(m => m.kind === kind).length;
  let images = count('image');
  let videos = count('video');
  const items: PickedMedia[] = [];
  let error: string | null = null;
  const reject = (key: Parameters<typeof translate>[0]) => {
    error ??= translate(key);
  };

  for (const m of candidates) {
    if (m.kind === 'image') {
      if (!IMAGE_TYPES.includes(m.mimeType)) {
        reject('community.compose.unsupportedType');
      }
      else if (m.fileSize > MAX_IMAGE_BYTES) {
        reject('community.compose.imageTooBig');
      }
      else if (images >= MAX_IMAGES) {
        reject('community.compose.tooManyPhotos');
      }
      else {
        images++;
        items.push(m);
      }
    }
    else if (!VIDEO_TYPES.includes(m.mimeType)) {
      reject('community.compose.unsupportedType');
    }
    else if (m.fileSize > MAX_VIDEO_BYTES) {
      reject('community.compose.videoTooBig');
    }
    else if (videos >= MAX_VIDEOS) {
      reject('community.compose.tooManyVideos');
    }
    else {
      videos++;
      items.push(m);
    }
  }
  return { items, error };
}

/**
 * Launches the native picker (photos and videos, multi-select) and returns the
 * validated selection. Resolves empty on cancel or denied permission.
 *
 * `expo-image-picker` is lazily required inside the function body — a
 * top-level import would touch the native module at module-eval time,
 * which crashes under the New Architecture (see feedback_rn_expo_module_init).
 */
export async function pickMedia(existing: PickedMedia[]): Promise<PickMediaResult> {
  const remaining = MAX_IMAGES + MAX_VIDEOS - existing.length;
  if (remaining <= 0) {
    return { items: [], error: translate('community.compose.tooManyPhotos') };
  }
  const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { items: [], error: null };
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    quality: 0.8,
    exif: false,
  });
  if (res.canceled) {
    return { items: [], error: null };
  }
  const candidates = res.assets.map((asset): PickedMedia => {
    const kind: MediaKind = asset.type === 'video' ? 'video' : 'image';
    return {
      uri: asset.uri,
      kind,
      mimeType: normalizeMime(asset.mimeType, asset.uri),
      fileName: asset.fileName ?? `${kind === 'video' ? 'video' : 'photo'}-${Date.now()}`,
      fileSize: asset.fileSize ?? 0,
      duration: asset.duration ?? undefined,
    };
  });
  return validateMedia(candidates, existing);
}
