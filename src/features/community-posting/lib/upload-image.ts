import type { ImageUploadUrlResult, PostImage } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { client } from '@/lib/api/client';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class ImageUploadError extends Error {
  constructor(public readonly status: number) {
    super(`Image upload failed (${status})`);
    this.name = 'ImageUploadError';
  }
}

/** Thrown when the resolved image size (picker metadata, or the fetched blob when that's missing/zero) exceeds the 10 MB limit. */
export class ImageTooLargeError extends Error {
  constructor() {
    super('Image exceeds the 10 MB upload limit');
    this.name = 'ImageTooLargeError';
  }
}

/**
 * Sanitises a filename for the backend's `assertSafeFilename` check
 * (`/^[\w][\w.-]{0,120}$/`): every character outside `[\w.-]` becomes `-`,
 * runs of `-` collapse to one, and any leading non-word character (left
 * behind by a name that started with punctuation) is stripped. Falls back
 * to a generated name when nothing usable survives.
 */
export function sanitizeFilename(name: string): string {
  const fallback = () => `photo-${Date.now()}.jpg`;
  if (!name) {
    return fallback();
  }
  const safe = name
    .replace(/[^\w.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 120);
  return safe.length > 0 ? safe : fallback();
}

/**
 * Requests a signed upload URL from the backend, then PUTs the raw image
 * bytes straight to storage (bypassing the `client` axios instance — this
 * goes to a signed URL, not our API host). Returns the `imageKey` the
 * backend expects when creating the post.
 *
 * The blob is fetched first so the request always carries a real byte
 * count: picker metadata can report `fileSize: 0` on some Android/iOS asset
 * paths, which the backend's `positive()` schema rejects outright.
 */
export async function uploadImage(scope: MemberContentScope, image: PostImage): Promise<string> {
  const bytes = await fetch(image.uri).then(response => response.blob());
  const fileSize = image.fileSize > 0 ? image.fileSize : bytes.size;
  if (fileSize > MAX_IMAGE_BYTES) {
    throw new ImageTooLargeError();
  }

  const { data } = await client.post<ImageUploadUrlResult>('/api/community/post-image-upload-url', {
    organizationId: scope.organizationId,
    filename: sanitizeFilename(image.fileName),
    fileSize,
    contentType: image.mimeType,
  });

  const response = await fetch(data.signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': image.mimeType },
    body: bytes,
  });

  if (!response.ok) {
    throw new ImageUploadError(response.status);
  }

  return data.path;
}
