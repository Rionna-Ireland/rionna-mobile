import type { PickedMedia } from '@/features/community-posting/types';

import * as React from 'react';

import { MAX_IMAGES, MAX_VIDEOS } from '@/features/community-posting/lib/limits';
import { pickMedia } from '@/features/community-posting/lib/pick-media';
import { uploadMedia } from '@/features/community-posting/lib/upload-media';

export type ComposeMediaItem = {
  id: string;
  media: PickedMedia;
  status: 'uploading' | 'done' | 'failed';
  progress: number;
  mediaToken?: string;
};

let nextId = 0;

/**
 * Composer media state: items upload as soon as they're picked. Removing an
 * item aborts its upload and drops any late result (the id no longer matches).
 */
export function useComposeMedia(organizationId: string) {
  const [items, setItems] = React.useState<ComposeMediaItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const controllers = React.useRef(new Map<string, AbortController>());
  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  const patch = React.useCallback((id: string, change: Partial<ComposeMediaItem>) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const start = React.useCallback((id: string, media: PickedMedia) => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    patch(id, { status: 'uploading', progress: 0 });
    uploadMedia(media, {
      organizationId,
      signal: controller.signal,
      onProgress: progress => patch(id, { progress }),
    }).then(
      mediaToken => patch(id, { status: 'done', progress: 1, mediaToken }),
      () => {
        if (!controller.signal.aborted) {
          patch(id, { status: 'failed' });
        }
      },
    );
  }, [organizationId, patch]);

  const add = React.useCallback(async () => {
    const result = await pickMedia(itemsRef.current.map(item => item.media));
    setError(result.error);
    const added = result.items.map(media => ({ id: `m${nextId++}`, media, status: 'uploading' as const, progress: 0 }));
    if (added.length === 0) {
      return;
    }
    setItems(prev => [...prev, ...added]);
    added.forEach(item => start(item.id, item.media));
  }, [start]);

  const remove = React.useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems(prev => prev.filter(item => item.id !== id));
    setError(null);
  }, []);

  const retry = React.useCallback((id: string) => {
    const item = itemsRef.current.find(candidate => candidate.id === id);
    if (item) {
      start(id, item.media);
    }
  }, [start]);

  React.useEffect(() => {
    const live = controllers.current;
    return () => live.forEach(controller => controller.abort());
  }, []);

  return {
    items,
    error,
    add,
    remove,
    retry,
    canAdd: items.length < MAX_IMAGES + MAX_VIDEOS,
    isBusy: items.some(item => item.status !== 'done'),
  };
}
