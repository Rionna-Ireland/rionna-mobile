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
  /** Symmetric in-out: the Arrival mark's breathing loop. */
  breathe: Easing.inOut(Easing.ease),
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
  /** Signature draws: the Arrival submark outline, the charity count-up + goal bar (`slow`×2). */
  draw: { duration: durations.draw, easing: easings.enter },
  /** Skeleton shimmer sweep: constant speed, so the band never seems to pause. */
  shimmer: { duration: durations.shimmer, easing: Easing.linear },
  /** One half-cycle of the mark breathing (Arrival waiting on data, the refresher while loading). */
  breathe: { duration: durations.breathe, easing: easings.breathe },
};

/**
 * Reanimated springs are at rest after about this multiple of their perceptual
 * `duration`. Use it to know when a spring-driven hand-off has landed.
 */
export const SPRING_SETTLE_FACTOR = 1.5;

/** Settle time (ms) of a spring token: when it's safe to swap the overlay out. */
export function springSettleMs(spring: SpringToken): number {
  return Math.round(springs[spring].duration * SPRING_SETTLE_FACTOR);
}

/**
 * Arrival (S14-04, S14-00 decisions 14 and 17). Caps keep the splash honest:
 * it never holds the app past `maxDataWaitMs` after the fill, whatever the
 * network does; Home's skeletons take over from there.
 */
export const arrival = {
  /** Signed-in cold launch: draw + fill must land inside this (ms). */
  signedInCapMs: 1200,
  /** Data later than this after the fill: the mark starts breathing. */
  dataGraceMs: 300,
  /** Never wait for data longer than this after the fill: hand off anyway. */
  maxDataWaitMs: 1200,
  /** Breathing dips the mark's opacity to this. */
  breatheOpacity: 0.85,
  /** Signed-out: the lockup holds this long before the light → navy crossfade. */
  lockupHoldMs: 250,
  /** First-login welcome is on screen at least this long. */
  welcomeMinMs: 1600,
  /** Repeat sign-ins (welcome already seen): the short welcome. */
  welcomeRepeatMinMs: 600,
  /** Welcome lines set this far apart. */
  welcomeLineStepMs: 120,
  /** Welcome lines rise this far (pt) as they fade in. */
  welcomeRise: 8,
  /** Pattern wave: per-diagonal delay, `(col + row) × waveStepMs`. */
  waveStepMs: 90,
  /** Pattern wave tiles fade up to this opacity. */
  waveTileOpacity: 0.12,
} as const;

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
/**
 * Disabled controls dim to this opacity. `MotionPressable` owns it (one source:
 * no `opacity-40` classes), fading on `timings.quick` when `disabled` flips.
 */
export const disabledOpacity = 0.4;
/** Like heart: pops from this scale back to 1 on the `snappy` spring. */
export const popScale = 0.85;

/**
 * Horse card → Horse detail hero transition (S14-05, signature 2). The flight
 * itself runs on the `hero` spring; these are its hand-off budgets and the
 * scroll-linked hero (parallax, overscroll stretch).
 */
export const heroTransition = {
  /** Detail content under the hero starts its fade-up this long after the push. */
  contentDelayMs: 120,
  /** Wait at most this long for the overlay's (cached) photo to draw before giving up → crossfade. */
  imageWaitMs: durations.quick,
  /** After landing, hold over the hero at most this long for its photo / data, then crossfade out. */
  holdMaxMs: 1500,
  /** Grace past every deadline before the overlay is force-unmounted, whatever state it's in. */
  safetyMarginMs: 250,
  /** The frame-drop check watches this many frame intervals once the flight starts… */
  dropCheckFrames: 3,
  /** …and aborts to a crossfade when every one of them is longer than this (1.5 × a 60Hz frame). */
  droppedFrameMs: 25,
  /** Parallax: the hero photo travels at this fraction of the scroll speed. */
  parallax: 0.5,
} as const;

/** Worst-case lifetime (ms) of a hero flight overlay: it is always gone by then. */
export function heroFlightCapMs(): number {
  return heroTransition.imageWaitMs
    + springSettleMs('hero')
    + heroTransition.holdMaxMs
    + durations.quick
    + heroTransition.safetyMarginMs;
}
