import type { SharedValue } from 'react-native-reanimated';
import type { Rect } from './hero-math';
import type { HeroDestinationInfo, HeroReveal } from './types';

import * as React from 'react';

import { durations } from '@/lib/motion';

import { useHeroApi, useHeroFlight } from './hero-transition-provider';

export type HeroDestination = {
  /** The hero's visibility while a flight for this horse is in progress; undefined at rest. */
  reveal: HeroReveal | undefined;
  /** This screen was opened by a forward flight (its content rises in behind the photo). */
  enteredWithHero: boolean;
  onHeroLayout: (height: number) => void;
  onNameLayout: (rect: Rect) => void;
  onPhotoDisplayed: (uri: string) => void;
  onPhotoIndexChange: (index: number) => void;
  bindScroll: (scrollY: SharedValue<number>) => void;
};

/**
 * Horse detail's side of the hero transition (S14-05 §3): reports the hero's
 * frame, name and photo to the controller and reads back whether to hide the
 * hero while the overlay flies. Without the provider it's inert.
 *
 * `hadSkeleton`: the content crossfaded in over a skeleton (S14-03), so the
 * hero only counts as drawn once that `base` crossfade has finished;
 * swapping earlier would show the half-faded hero over the skeleton.
 */
export function useHeroDestination(horseId: string | undefined, hadSkeleton: boolean): HeroDestination {
  const api = useHeroApi();
  const flight = useHeroFlight();
  const active = !!api && !!horseId && flight?.horseId === horseId;
  const [enteredWithHero] = React.useState(() => active && flight?.direction === 'forward');
  const info = React.useRef<HeroDestinationInfo>({
    heroHeight: 0,
    nameRect: null,
    nameScroll: 0,
    photoIndex: 0,
    photoUri: null,
    scrollY: null,
  });

  React.useEffect(() => {
    if (!api || !horseId)
      return;
    return api.registerDestination(horseId, info.current);
  }, [api, horseId]);

  const callbacks = React.useMemo(() => {
    const changed = () => {
      if (api && horseId)
        api.destinationLayout(horseId);
    };
    return {
      onHeroLayout: (height: number) => {
        info.current.heroHeight = height;
        changed();
      },
      onNameLayout: (rect: Rect) => {
        info.current.nameRect = rect;
        info.current.nameScroll = info.current.scrollY?.get() ?? 0;
        changed();
      },
      onPhotoDisplayed: (uri: string) => {
        info.current.photoUri = uri;
        if (!api || !horseId)
          return;
        if (hadSkeleton)
          setTimeout(() => api.destinationReady(horseId), durations.base);
        else
          api.destinationReady(horseId);
      },
      onPhotoIndexChange: (index: number) => {
        info.current.photoIndex = index;
      },
      bindScroll: (scrollY: SharedValue<number>) => {
        info.current.scrollY = scrollY;
      },
    };
  }, [api, horseId, hadSkeleton]);

  return { reveal: active ? api.reveal : undefined, enteredWithHero, ...callbacks };
}
