import type { Href } from 'expo-router';
import type { PushMode } from './types';

import { useRouter } from 'expo-router';
import * as React from 'react';

import { useHeroApi } from './hero-transition-provider';

/** The detail route; `transition` tells the stack to fade instead of sliding (the overlay is the transition). */
export function horseDetailHref(horseId: string, mode: PushMode): Href {
  return mode === 'default' ? `/stables/${horseId}` : `/stables/${horseId}?transition=${mode}`;
}

/**
 * Open a horse's detail, flying the photo from `sourceKey` when it can
 * (S14-05 §4). Reduce Motion / low-end Android → a quick crossfade push; no
 * usable source (deep link, no photo) → the default stack push.
 */
export function useOpenHorse() {
  const router = useRouter();
  const api = useHeroApi();
  const opening = React.useRef(false);
  return React.useCallback((horseId: string, sourceKey?: string) => {
    if (!api) {
      router.push(horseDetailHref(horseId, 'default'));
      return;
    }
    // A double tap mustn't push twice while the source is being measured.
    if (opening.current)
      return;
    opening.current = true;
    api.open(horseId, sourceKey)
      .catch((): PushMode => 'default')
      .then(mode => router.push(horseDetailHref(horseId, mode)))
      .finally(() => {
        opening.current = false;
      });
  }, [api, router]);
}
