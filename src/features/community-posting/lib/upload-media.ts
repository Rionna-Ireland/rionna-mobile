import type { MediaUploadUrlResult, PickedMedia } from '@/features/community-posting/types';

import { fileDigest } from '@/features/community-posting/lib/md5';
import { client } from '@/lib/api/client';

const MAX_CONCURRENT = 3;

export class MediaUploadError extends Error {
  constructor(public readonly status: number) {
    super(`Media upload failed (${status})`);
    this.name = 'MediaUploadError';
  }
}

let active = 0;
const waiters: (() => void)[] = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  // The releasing upload hands its slot straight to us, so `active` is unchanged.
  await new Promise<void>(resolve => waiters.push(resolve));
}

function release() {
  const next = waiters.shift();
  if (next) {
    next();
  }
  else {
    active--;
  }
}

/** Mirrors the backend's `assertSafeFilename` (`/^[\w][\w.-]{0,120}$/`). */
function safeFilename(name: string): string {
  const safe = name.replace(/[^\w.-]/g, '-').replace(/-+/g, '-').replace(/^[.-]+/, '').slice(0, 120);
  return safe || `media-${Date.now()}`;
}

type UploadOptions = {
  organizationId: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

async function attempt(media: PickedMedia, { organizationId, onProgress, signal }: UploadOptions): Promise<string> {
  const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  const { checksum, byteSize } = await fileDigest(media.uri);
  const { data } = await client.post<MediaUploadUrlResult>('/api/community/media-upload', {
    organizationId,
    filename: safeFilename(media.fileName),
    contentType: media.mimeType,
    byteSize,
    checksum,
  });

  // Streams from disk (no whole-file read) and reports progress.
  const task = FileSystem.createUploadTask(
    data.uploadUrl,
    media.uri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: data.uploadHeaders,
    },
    p => onProgress?.(p.totalBytesExpectedToSend > 0 ? p.totalBytesSent / p.totalBytesExpectedToSend : 0),
  );
  const onAbort = () => void task.cancelAsync();
  signal?.addEventListener('abort', onAbort);
  try {
    const result = await task.uploadAsync();
    if (!result || result.status < 200 || result.status >= 300) {
      throw new MediaUploadError(result?.status ?? 0);
    }
  }
  finally {
    signal?.removeEventListener('abort', onAbort);
  }
  return data.mediaToken;
}

/**
 * Uploads one picked item straight to Circle's S3 (via our presign endpoint)
 * and returns the `mediaToken` for `createPost`. At most 3 run at once; one
 * automatic retry (fresh presign) unless aborted.
 */
export async function uploadMedia(media: PickedMedia, options: UploadOptions): Promise<string> {
  await acquire();
  try {
    for (let tries = 0; ; tries++) {
      if (options.signal?.aborted) {
        throw new Error('aborted');
      }
      try {
        options.onProgress?.(0);
        return await attempt(media, options);
      }
      catch (e) {
        if (tries >= 1 || options.signal?.aborted) {
          throw e;
        }
      }
    }
  }
  finally {
    release();
  }
}
