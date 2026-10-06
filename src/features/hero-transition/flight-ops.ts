import type { SharedValue } from 'react-native-reanimated';
import type { Flight, FlightDirection, FlightGeometry, HeroReveal, HeroSource } from './types';

import { cancelAnimation, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { durations, heroFlightCapMs, heroTransition, springs, springSettleMs, timings } from '@/lib/motion';

import { EMPTY_RECT } from './hero-math';

/**
 * The flight's imperative core (S14-05): one overlay at a time, every path
 * ends in `endFlight`, and every flight is time-boxed:
 *
 *   begin ─(overlay photo drawn)→ start ─(spring at rest)→ land ─(hero drawn)→ swap → end
 *     │ image wait expires                 │ 3 dropped frames       │ hold expires
 *     └──────────────→ crossfade out ←─────┴────────────────────────┘ → end
 *   …and a hard cap (`heroFlightCapMs`) ends it whatever happened.
 *
 * Hand-offs (overlay ↔ hero / source) flip shared values inside one UI-thread
 * worklet, so both sides change in the same frame.
 */

export type FlightValues = {
  /** 0 → 1 on the `hero` spring, from the `from*` end to the `to*` end. */
  progress: SharedValue<number>;
  /** The whole overlay; fades to 0 on a crossfade abort. */
  opacity: SharedValue<number>;
  geometry: SharedValue<FlightGeometry>;
  /** The frame-drop check runs while true. */
  watching: SharedValue<boolean>;
  reveal: HeroReveal;
};

type Runtime = {
  id: number;
  horseId: string;
  direction: FlightDirection;
  source: HeroSource;
  /** Reverse: pops the detail screen once the overlay has drawn. */
  pop?: () => void;
  started: boolean;
  landed: boolean;
  destReady: boolean;
  finishing: boolean;
  timers: ReturnType<typeof setTimeout>[];
};

export type FlightCtx = {
  values: FlightValues;
  runtime: { current: Runtime | null };
  nextId: { current: number };
  setFlight: (flight: Flight | null) => void;
};

export const EMPTY_GEOMETRY: FlightGeometry = {
  fromClip: EMPTY_RECT,
  fromImage: EMPTY_RECT,
  toClip: EMPTY_RECT,
  toImage: EMPTY_RECT,
  fromRadius: 0,
  toRadius: 0,
  cardName: null,
  heroName: null,
};

function current(ctx: FlightCtx, id: number): Runtime | null {
  const rt = ctx.runtime.current;
  return rt && rt.id === id ? rt : null;
}

function later(rt: Runtime, fn: () => void, ms: number) {
  rt.timers.push(setTimeout(fn, ms));
}

/** Unmount the overlay and put everything back at rest. Safe to call twice. */
export function endFlight(ctx: FlightCtx, id: number) {
  const rt = current(ctx, id);
  if (!rt)
    return;
  rt.timers.forEach(clearTimeout);
  rt.timers = [];
  ctx.runtime.current = null;
  const { progress, opacity, watching, reveal } = ctx.values;
  const hidden = rt.source.hidden;
  cancelAnimation(progress);
  scheduleOnUI(() => {
    'worklet';
    watching.set(false);
    opacity.set(1);
    reveal.shown.set(1);
    reveal.details.set(1);
    reveal.name.set(1);
    hidden.set(0);
  });
  ctx.setFlight(null);
}

/** Fallback for any failure: the overlay fades out and the real views fade in under it. */
export function crossfadeOut(ctx: FlightCtx, id: number) {
  const rt = current(ctx, id);
  if (!rt || rt.finishing)
    return;
  rt.finishing = true;
  const { opacity, watching, reveal } = ctx.values;
  const hidden = rt.source.hidden;
  const fadeOut = timings.exit;
  const fadeIn = timings.quick;
  scheduleOnUI(() => {
    'worklet';
    watching.set(false);
    opacity.set(withTiming(0, fadeOut));
    reveal.shown.set(withTiming(1, fadeIn));
    reveal.details.set(withTiming(1, fadeIn));
    reveal.name.set(withTiming(1, fadeIn));
    hidden.set(0);
  });
  if (rt.direction === 'reverse' && !rt.started)
    rt.pop?.();
  later(rt, () => endFlight(ctx, id), durations.quick + heroTransition.safetyMarginMs);
}

/** Forward hand-off: the hero appears exactly under the landed overlay, which vanishes in the same frame. */
function swapToHero(ctx: FlightCtx, rt: Runtime) {
  rt.finishing = true;
  const { opacity, watching, reveal, geometry } = ctx.values;
  const hidden = rt.source.hidden;
  const drewName = geometry.get().heroName !== null;
  const fadeIn = timings.quick;
  scheduleOnUI(() => {
    'worklet';
    watching.set(false);
    reveal.shown.set(1);
    opacity.set(0);
    hidden.set(0);
    reveal.name.set(drewName ? 1 : withTiming(1, fadeIn));
    reveal.details.set(withTiming(1, fadeIn));
  });
  // Unmount once the details have faded in (until then the hero still reads `reveal`).
  later(rt, () => endFlight(ctx, rt.id), durations.quick + heroTransition.safetyMarginMs);
}

/** Reverse hand-off: the source photo reappears under the landed overlay. */
function swapToSource(ctx: FlightCtx, rt: Runtime) {
  rt.finishing = true;
  const { opacity, watching } = ctx.values;
  const hidden = rt.source.hidden;
  scheduleOnUI(() => {
    'worklet';
    watching.set(false);
    hidden.set(0);
    opacity.set(0);
  });
  later(rt, () => endFlight(ctx, rt.id), durations.instant);
}

function trySwap(ctx: FlightCtx, rt: Runtime) {
  if (rt.finishing)
    return;
  if (rt.direction === 'reverse') {
    if (rt.landed)
      swapToSource(ctx, rt);
    return;
  }
  if (rt.landed && rt.destReady)
    swapToHero(ctx, rt);
}

/** The spring came to rest (called from the UI thread via `scheduleOnRN`). */
export function landFlight(ctx: FlightCtx, id: number) {
  const rt = current(ctx, id);
  if (!rt)
    return;
  rt.landed = true;
  trySwap(ctx, rt);
}

/** The detail hero has drawn its photo (forward flights wait for it before swapping). */
export function destinationReady(ctx: FlightCtx, horseId: string) {
  const rt = ctx.runtime.current;
  if (!rt || rt.horseId !== horseId || rt.direction !== 'forward')
    return;
  rt.destReady = true;
  trySwap(ctx, rt);
}

/**
 * The overlay's first photo frame is on screen: hide the real view it covers
 * and launch the spring. Reverse flights pop the detail screen here, so the
 * hero never disappears before its stand-in has drawn.
 */
export function startFlight(ctx: FlightCtx, id: number, onLanded: (id: number) => void) {
  const rt = current(ctx, id);
  if (!rt || rt.started || rt.finishing)
    return;
  rt.started = true;
  const { progress, watching, reveal } = ctx.values;
  const hidden = rt.source.hidden;
  const reverse = rt.direction === 'reverse';
  const spring = springs.hero;
  scheduleOnUI(() => {
    'worklet';
    hidden.set(1);
    if (reverse)
      reveal.shown.set(0);
    watching.set(true);
    progress.set(0);
    progress.set(withSpring(1, spring, (finished) => {
      'worklet';
      if (finished)
        scheduleOnRN(onLanded, id);
    }));
  });
  if (reverse)
    rt.pop?.();
  // Forward: land + wait for the hero's photo, then give up. Reverse: nothing to wait for.
  const deadline = springSettleMs('hero') + (reverse ? heroTransition.safetyMarginMs : heroTransition.holdMaxMs);
  later(rt, () => {
    if (reverse) {
      rt.landed = true;
      trySwap(ctx, rt);
    }
    else {
      crossfadeOut(ctx, id);
    }
  }, deadline);
}

export type BeginSpec = {
  horseId: string;
  direction: FlightDirection;
  source: HeroSource;
  geometry: FlightGeometry;
  baseUri: string;
  topUri: string | null;
  imageBase: { width: number; height: number };
  name: string | null;
  pop?: () => void;
};

/** Mount a new overlay (ending any previous one) with its deadlines armed. */
export function beginFlight(ctx: FlightCtx, spec: BeginSpec): number {
  if (ctx.runtime.current)
    endFlight(ctx, ctx.runtime.current.id);
  const id = ctx.nextId.current + 1;
  ctx.nextId.current = id;
  const { values } = ctx;
  values.geometry.set(spec.geometry);
  values.progress.set(0);
  values.opacity.set(1);
  values.watching.set(false);
  if (spec.direction === 'forward') {
    values.reveal.shown.set(0);
    values.reveal.details.set(0);
    values.reveal.name.set(0);
  }
  const rt: Runtime = {
    id,
    horseId: spec.horseId,
    direction: spec.direction,
    source: spec.source,
    pop: spec.pop,
    started: false,
    landed: false,
    destReady: false,
    finishing: false,
    timers: [],
  };
  ctx.runtime.current = rt;
  ctx.setFlight({
    id,
    horseId: spec.horseId,
    direction: spec.direction,
    baseUri: spec.baseUri,
    topUri: spec.topUri,
    imageBase: spec.imageBase,
    name: spec.name,
  });
  // The overlay must draw its (cached) photo quickly, or we don't fly at all.
  later(rt, () => {
    if (!rt.started)
      crossfadeOut(ctx, id);
  }, heroTransition.imageWaitMs);
  // Whatever happens, the overlay is gone by the cap.
  later(rt, () => endFlight(ctx, id), heroFlightCapMs());
  return id;
}

/** Point the forward flight's landing at the hero's measured frame / name (mid-flight retarget). */
export function retarget(ctx: FlightCtx, horseId: string, patch: Partial<Pick<FlightGeometry, 'toClip' | 'toImage' | 'heroName'>>) {
  const rt = ctx.runtime.current;
  if (!rt || rt.horseId !== horseId || rt.direction !== 'forward' || rt.finishing)
    return;
  ctx.values.geometry.set({ ...ctx.values.geometry.get(), ...patch });
}

export function activeFlight(ctx: FlightCtx): { id: number; horseId: string; direction: FlightDirection } | null {
  const rt = ctx.runtime.current;
  return rt ? { id: rt.id, horseId: rt.horseId, direction: rt.direction } : null;
}
