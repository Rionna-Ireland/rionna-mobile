import type { ImageUploadUrlResult, PostImage } from '@/features/community-posting/types';
import type { MemberContentScope } from '@/features/member-content/types';

import { client } from '@/lib/api/client';

export class ImageUploadError extends Error {
  constructor(public readonly status: number) {
    super(`Image upload failed (${status})`);
    this.name = 'ImageUploadError';
  }
}

/**
 * Requests a signed upload URL from the backend, then PUTs the raw image
 * bytes straight to storage (bypassing the `client` axios instance — this
 * goes to a signed URL, not our API host). Returns the `imageKey` the
 * backend expects when creating the post.
 */
export async function uploadImage(scope: MemberContentScope, image: PostImage): Promise<string> {
  const { data } = await client.post<ImageUploadUrlResult>('/api/community/posts/image-upload-url', {
    organizationId: scope.organizationId,
    filename: image.fileName,
    fileSize: image.fileSize,
    contentType: image.mimeType,
  });

  const bytes = await fetch(image.uri).then(response => response.blob());
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
