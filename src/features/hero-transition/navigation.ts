import type { BeginSpec, FlightCtx } from './flight-ops';
import type { Rect } from './hero-math';
import type { HeroDestinationInfo, HeroSource, PushMode } from './types';

import { heroTransition } from '@/lib/motion';

import { activeFlight, beginFlight, endFlight } from './flight-ops';
import { coverRect, heroFrameAtScroll, isRectOnscreen } from './hero-math';

/**
 * Deciding how a horse opens and closes (S14-05 §4, §6, §7). Pure-ish: the
 * registries and the environment come in, a push mode or a flight goes out.
 */

export type HeroEnv = {
  reduceMotion: boolean;
  lowEnd: boolean;
  /** Window width: the hero is full-bleed, at least this tall. */
  width: number;
  /** Where a source may sit and still fly: below the header, above the tab bar. */
  viewport: Rect;
};

/** Everything a navigation decision needs. */
export type HeroDeps = { ctx: FlightCtx; env: HeroEnv; registry: HeroRegistry };

export type HeroRegistry = {
  sources: Map<string, HeroSource>;
  destinations: Map<string, HeroDestinationInfo>;
  /** horseId → the source key the detail was opened from (for the reverse flight). */
  openedFrom: Map<string, string>;
};

/** Reduce Motion and low-end Android never fly: a quick crossfade push instead. */
export function fallbackMode(env: HeroEnv): PushMode | null {
  return env.reduceMotion || env.lowEnd ? 'fade' : null;
}

/** The hero frame before it reports its layout: full width, square (its `minHeight`). */
export function estimatedHeroRect(env: HeroEnv, heroHeight = 0): Rect {
  return { x: 0, y: 0, width: env.width, height: heroHeight > 0 ? heroHeight : env.width };
}

/** The inner image's fixed layout size: the photo covering the (estimated) hero frame. */
function imageBase(env: HeroEnv, aspect: number) {
  const box = coverRect(aspect, estimatedHeroRect(env));
  return { width: box.width, height: box.height };
}

/**
 * Open a horse's detail from `source`. Returns the push mode to use; when it's
 * `hero`, the overlay is already mounted at the source's rect.
 */
export async function openFromSource({ ctx, env, registry }: HeroDeps, horseId: string, sourceKey?: string): Promise<PushMode> {
  const fallback = fallbackMode(env);
  if (fallback)
    return fallback;
  const source = sourceKey ? registry.sources.get(sourceKey) : undefined;
  const aspect = source?.aspect() ?? null;
  if (!source || source.horseId !== horseId || !aspect)
    return 'default';
  const [rect, cardName] = await Promise.all([source.measure(), source.measureName?.() ?? Promise.resolve(null)]);
  if (!rect || !isRectOnscreen(rect, env.viewport))
    return 'fade';
  const toClip = estimatedHeroRect(env);
  const spec: BeginSpec = {
    horseId,
    direction: 'forward',
    source,
    geometry: {
      fromClip: rect,
      fromImage: coverRect(aspect, rect),
      toClip,
      toImage: coverRect(aspect, toClip),
      fromRadius: source.radius,
      toRadius: 0,
      cardName,
      heroName: null,
    },
    baseUri: source.uri,
    topUri: source.heroUri === source.uri ? null : source.heroUri,
    imageBase: imageBase(env, aspect),
    name: source.name ?? null,
  };
  beginFlight(ctx, spec);
  registry.openedFrom.set(horseId, source.key);
  return 'hero';
}

/** Can the hero fly back into its source right now? Returns what it needs, or null (plain pop). */
function reverseInputs(env: HeroEnv, registry: HeroRegistry, horseId: string) {
  if (fallbackMode(env))
    return null;
  const key = registry.openedFrom.get(horseId);
  const source = key ? registry.sources.get(key) : undefined;
  const dest = registry.destinations.get(horseId);
  const aspect = source?.aspect() ?? null;
  if (!source || source.horseId !== horseId || !dest || !aspect)
    return null;
  // Only the photo the source shows can fly back (not another carousel page or a fallback).
  if (dest.photoIndex !== 0 || dest.photoUri !== source.heroUri)
    return null;
  const scrollY = Math.max(0, dest.scrollY?.get() ?? 0);
  const heroRect = estimatedHeroRect(env, dest.heroHeight);
  if (scrollY > heroRect.height / 2)
    return null;
  return { source, dest, aspect, scrollY, heroRect };
}

/**
 * Back button on the detail: fly the hero back into its (re-measured) source,
 * or just `pop` (the route's own fade) when it can't.
 */
export async function closeToSource({ ctx, env, registry }: HeroDeps, horseId: string, pop: () => void): Promise<void> {
  const active = activeFlight(ctx);
  if (active)
    endFlight(ctx, active.id);
  const inputs = reverseInputs(env, registry, horseId);
  if (!inputs) {
    pop();
    return;
  }
  const { source, dest, aspect, scrollY, heroRect } = inputs;
  const [rect, cardName] = await Promise.all([source.measure(), source.measureName?.() ?? Promise.resolve(null)]);
  if (!rect || !isRectOnscreen(rect, env.viewport)) {
    pop();
    return;
  }
  const from = heroFrameAtScroll(heroRect, scrollY, { parallax: heroTransition.parallax, aspect });
  const heroName = dest.nameRect ? { ...dest.nameRect, y: dest.nameRect.y - (scrollY - dest.nameScroll) } : null;
  beginFlight(ctx, {
    horseId,
    direction: 'reverse',
    source,
    geometry: {
      fromClip: from.clip,
      fromImage: from.image,
      toClip: rect,
      toImage: coverRect(aspect, rect),
      fromRadius: 0,
      toRadius: source.radius,
      cardName,
      heroName,
    },
    baseUri: source.heroUri,
    topUri: null,
    imageBase: imageBase(env, aspect),
    name: source.name ?? null,
    pop,
  });
}
