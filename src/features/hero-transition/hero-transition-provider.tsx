/* eslint-disable react-refresh/only-export-components */
import type { FlightCtx, FlightValues } from './flight-ops';
import type { Rect } from './hero-math';
import type { HeroDeps, HeroEnv, HeroRegistry } from './navigation';
import type { Flight, FlightGeometry, HeroDestinationInfo, HeroReveal, HeroSource, PushMode } from './types';

import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMPACT_BAR_HEIGHT } from '@/components/ui/scroll-header-math';
import { TAB_BAR_HEIGHT, useTabBarBottomOffset } from '@/components/ui/tab-bar-layout';
import { useMotion } from '@/lib/motion';

import {
  activeFlight,
  crossfadeOut,
  destinationReady,
  EMPTY_GEOMETRY,
  endFlight,
  landFlight,
  retarget,
  startFlight,
} from './flight-ops';
import { coverRect } from './hero-math';
import { HeroOverlay } from './hero-overlay';
import { closeToSource, estimatedHeroRect, openFromSource } from './navigation';

/**
 * Horse card → Horse detail hero transition (S14-05, signature 2).
 *
 * Reanimated 4.1 has no shared-element transitions, so this is a custom
 * overlay: sources register their photo, a tap measures it, the overlay
 * mounts here at the root (above the stack: the detail is a root-stack
 * screen that covers the tab bar, so there's nothing for it to sit under),
 * flies the photo to the hero frame on the `hero` spring and hands off to the
 * real hero in the same frame. See `flight-ops.ts` for the lifecycle.
 */

export type HeroApi = {
  registerSource: (source: HeroSource) => () => void;
  /** Mount the overlay if this tap can fly, and say how to push. */
  open: (horseId: string, sourceKey?: string) => Promise<PushMode>;
  /** Back button: fly back (then `pop`) or just `pop`. */
  close: (horseId: string, pop: () => void) => void;
  registerDestination: (horseId: string, info: HeroDestinationInfo) => () => void;
  /** The destination's hero frame / name moved (retargets a flight in progress). */
  destinationLayout: (horseId: string) => void;
  /** The destination's hero photo has drawn. */
  destinationReady: (horseId: string) => void;
  reveal: HeroReveal;
};

const ApiContext = React.createContext<HeroApi | null>(null);
const FlightContext = React.createContext<Flight | null>(null);

/** The controller, or null outside the provider (tests, isolated screens): callers then navigate plainly. */
export function useHeroApi(): HeroApi | null {
  return React.use(ApiContext);
}

/** The flight in progress (re-renders on start and end only). */
export function useHeroFlight(): Flight | null {
  return React.use(FlightContext);
}

function useFlightValues(): FlightValues {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const geometry = useSharedValue<FlightGeometry>(EMPTY_GEOMETRY);
  const watching = useSharedValue(false);
  const shown = useSharedValue(1);
  const details = useSharedValue(1);
  const name = useSharedValue(1);
  return React.useMemo(
    () => ({ progress, opacity, geometry, watching, reveal: { shown, details, name } }),
    [progress, opacity, geometry, watching, shown, details, name],
  );
}

/** Reduce Motion, device class and the viewport a source must sit inside to fly. */
function useHeroEnv(): HeroEnv {
  const { reduceMotion, deviceClass } = useMotion();
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const tabBarBottom = useTabBarBottomOffset();
  return React.useMemo(() => {
    const viewportTop = top + COMPACT_BAR_HEIGHT;
    const viewportBottom = height - tabBarBottom - TAB_BAR_HEIGHT;
    const viewport: Rect = { x: 0, y: viewportTop, width, height: Math.max(0, viewportBottom - viewportTop) };
    return { reduceMotion, lowEnd: deviceClass === 'low', width, viewport };
  }, [reduceMotion, deviceClass, width, height, top, tabBarBottom]);
}

function useRegistry(): HeroRegistry {
  const [registry] = React.useState<HeroRegistry>(() => ({
    sources: new Map(),
    destinations: new Map(),
    openedFrom: new Map(),
  }));
  return registry;
}

/** Forward flights land on the hero's measured frame and name once the detail reports them. */
function retargetToDestination({ ctx, env, registry }: HeroDeps, horseId: string) {
  const dest = registry.destinations.get(horseId);
  if (!dest)
    return;
  const toClip = estimatedHeroRect(env, dest.heroHeight);
  const geometry = ctx.values.geometry.get();
  const aspect = geometry.toImage.height > 0 ? geometry.toImage.width / geometry.toImage.height : 0;
  retarget(ctx, horseId, {
    toClip,
    toImage: coverRect(aspect, toClip),
    heroName: dest.nameRect,
  });
}

function useHeroController() {
  const values = useFlightValues();
  const env = useHeroEnv();
  const registry = useRegistry();
  const [flight, setFlight] = React.useState<Flight | null>(null);
  const [ctx] = React.useState<FlightCtx>(() => ({
    values,
    runtime: { current: null },
    nextId: { current: 0 },
    setFlight,
  }));
  const envRef = React.useRef(env);
  React.useEffect(() => {
    envRef.current = env;
  }, [env]);
  const deps = React.useCallback((): HeroDeps => ({ ctx, env: envRef.current, registry }), [ctx, registry]);

  const api = React.useMemo<HeroApi>(() => ({
    registerSource: (source) => {
      registry.sources.set(source.key, source);
      return () => {
        if (registry.sources.get(source.key) === source)
          registry.sources.delete(source.key);
      };
    },
    open: (horseId, sourceKey) => openFromSource(deps(), horseId, sourceKey),
    close: (horseId, pop) => {
      void closeToSource(deps(), horseId, pop);
    },
    registerDestination: (horseId, info) => {
      registry.destinations.set(horseId, info);
      return () => {
        if (registry.destinations.get(horseId) === info)
          registry.destinations.delete(horseId);
        // The detail went away mid-flight (e.g. an edge swipe back): nothing left to land on.
        const active = activeFlight(ctx);
        if (active?.horseId === horseId && active.direction === 'forward')
          endFlight(ctx, active.id);
      };
    },
    destinationLayout: horseId => retargetToDestination(deps(), horseId),
    destinationReady: horseId => destinationReady(ctx, horseId),
    reveal: values.reveal,
  }), [ctx, registry, deps, values.reveal]);

  const overlay = React.useMemo(() => ({
    onImageDrawn: (id: number) => startFlight(ctx, id, landedId => landFlight(ctx, landedId)),
    onFramesDropped: (id: number) => crossfadeOut(ctx, id),
  }), [ctx]);

  return { api, flight, values, overlay };
}

export function HeroTransitionProvider({ children }: { children: React.ReactNode }) {
  const { api, flight, values, overlay } = useHeroController();
  return (
    <ApiContext value={api}>
      <FlightContext value={flight}>
        {children}
        {flight
          ? (
              <HeroOverlay
                key={flight.id}
                flight={flight}
                values={values}
                onImageDrawn={overlay.onImageDrawn}
                onFramesDropped={overlay.onFramesDropped}
              />
            )
          : null}
      </FlightContext>
    </ApiContext>
  );
}
