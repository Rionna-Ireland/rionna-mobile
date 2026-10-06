import type { WithSpringConfig } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

/**
 * Motion tokens (S14-01 §2, D40): the ONLY source of durations, springs,
 * easings, stagger and press scales. `motion-guard.test.ts` fails the build on
 * raw durations/spring physics outside `src/lib/motion` and the primitives.
 *
 * Personality (S14-00 decision 12): quiet luxury / editorial. Critically-damped
 * springs with near-zero overshoot; touch feedback < 100ms; content on slow
 * ease-outs. Motion explains where things come from; it doesn't decorate.
 */

/**
 * Springs use Reanimated 4's `duration` + `dampingRatio` form so they read as
 * intent rather than physics. `duration` is Reanimated's *perceptual* duration
 * (the spring is fully at rest after ~1.5×).
 */
export const springs = {
  /** Touch feedback: press scale, toggles. Critically damped, ~120ms. */
  snappy: { duration: 120, dampingRatio: 1 },
  /** Content: cards, sheets, list items settling in. ~350ms. */
  gentle: { duration: 350, dampingRatio: 1 },
  /** Photo surfaces (Horse hero, Inside Track): ~500ms, a breath of overshoot. */
  hero: { duration: 500, dampingRatio: 0.95 },
  /** Splash / Arrival hand-off. ~700ms, critically damped. */
  settle: { duration: 700, dampingRatio: 1 },
} as const satisfies Record<string, WithSpringConfig>;

export type SpringToken = keyof typeof springs;

/** Timing durations (ms). */
export const durations = {
  /** Micro state flips: opacity on press, checkmarks. */
  instant: 100,
  /** Reduced-motion fallback fade; small reveals. */
  quick: 180,
  /** Default content transition. */
  base: 280,
  /** Large surfaces, editorial entrances. */
  slow: 450,
  /** Stroke-draws (splash submark, charity progress). */
  draw: 900,
  /** Indeterminate loaders: one full linear revolution of a ring spinner. */
  spin: 900,
  /** Skeleton shimmer: one slow linear sweep of the lighter band (S14-03). */
  shimmer: 1200,
  /** Refresher breathing loop: one half-cycle of the 0.6 ↔ 1 opacity pulse (S14-03). */
  breathe: 900,
} as const;

export type DurationToken = keyof typeof durations;

/** Easing curves for `withTiming`. */
export const easings = {
  /** "Emphasised decelerate": things arriving on screen. */
  enter: Easing.bezier(0.2, 0, 0, 1),
  /** Accelerate out: things leaving the screen. */
  exit: Easing.bezier(0.3, 0, 1, 1),
};

/** Ready-made `withTiming` configs pairing a duration with its easing. */
export const timings = {
  enter: { duration: durations.base, easing: easings.enter },
  enterSlow: { duration: durations.slow, easing: easings.enter },
  exit: { duration: durations.quick, easing: easings.exit },
  /** Reduce Motion: every entrance degrades to this opacity fade. */
  reducedFade: { duration: durations.quick, easing: easings.enter },
  /** Micro state flips (selected fills, checkmarks, count rolls). */
  quick: { duration: durations.quick, easing: easings.enter },
  /** Crossfades between two states of one control (Follow → Following). */
  crossfade: { duration: durations.base, easing: easings.enter },
  /** Indeterminate spinner revolution: constant speed, no easing. */
  spin: { duration: durations.spin, easing: Easing.linear },
  /** Skeleton shimmer sweep: constant speed, so the band never seems to pause. */
  shimmer: { duration: durations.shimmer, easing: Easing.linear },
  /** Refresher breathing: a soft in-out so the pulse has no hard turn-around. */
  breathe: { duration: durations.breathe, easing: Easing.inOut(Easing.sin) },
};

/** List entrance stagger: 40ms per item, capped so item 7+ arrives with item 6. */
export const stagger = {
  step: 40,
  maxItems: 6,
} as const;

/**
 * Entrance delay (ms) for the item at `index` in a staggered list. Items past
 * `stagger.maxItems` share the last slot, so long lists never wait.
 */
export function staggerDelay(index: number): number {
  const slot = Math.min(Math.max(0, Math.floor(index)), stagger.maxItems - 1);
  return slot * stagger.step;
}

/** Press-state scale targets. */
export const pressScale = 0.97;
/** Chips, icon buttons and other small targets press deeper. */
export const pressScaleSmall = 0.94;
/** Like heart: pops from this scale back to 1 on the `snappy` spring. */
export const popScale = 0.85;
