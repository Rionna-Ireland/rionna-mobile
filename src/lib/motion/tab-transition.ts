import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { Easing } from 'react-native';

import { durations } from './tokens';

/**
 * Tab switch fade-through (S14-02 §4), built on bottom-tabs v7's
 * `transitionSpec` + `sceneStyleInterpolator`, so screens stay mounted and the
 * custom tab bar is untouched.
 *
 * The navigator drives one progress value per scene: the incoming screen goes
 * ±1 → 0 and the outgoing one 0 → ±1, on the same linear `base` clock. Since
 * both are a function of |progress| alone, one curve serves both:
 *
 * - Outgoing: fades to 0 by `quick` (|p| = quick/base), then stays hidden.
 * - Incoming: hidden until the outgoing is gone, then fades in over the rest
 *   of `base` on the `enter` (decelerate) curve, rising 6pt into place.
 *
 * The enter curve is sampled into the interpolation stops because the native
 * driver can't run an easing inside `interpolate`.
 *
 * Reduce Motion: a plain `quick` crossfade, no rise.
 */

/** The incoming screen rises this far (pt). */
export const TAB_RISE = 6;

/** |progress| at which the outgoing screen is fully faded: quick / base. */
export const TAB_FADE_OUT_AT = durations.quick / durations.base;

const SAMPLES = 8;

type SceneInterpolator = NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']>;
type BottomTabSceneInterpolationProps = Parameters<SceneInterpolator>[0];

/** RN-Animated twin of `easings.enter` (Reanimated's Easing isn't RN-Animated compatible). */
const enterCurve = Easing.bezier(0.2, 0, 0, 1);

type Stops = { inputRange: number[]; outputRange: number[] };

/** Mirror stops sampled on |p| ∈ [0, 1] onto p ∈ [-1, 1] (inputRange must increase). */
function mirror(magnitudes: number[], values: number[]): Stops {
  const negIn = magnitudes.slice(1).map(m => -m).reverse();
  const negOut = values.slice(1).reverse();
  return { inputRange: [...negIn, ...magnitudes], outputRange: [...negOut, ...values] };
}

/**
 * Opacity stops for a scene at |progress| m: 1 at rest, eased down to 0 at
 * `TAB_FADE_OUT_AT`, 0 beyond. Read backwards (m: 1 → 0) it's the incoming
 * screen's eased fade-in.
 */
export function fadeThroughOpacityStops(curve: (t: number) => number = enterCurve): Stops {
  const magnitudes: number[] = [];
  const values: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES; // incoming fade-in fraction, 0 → 1
    magnitudes.push((1 - t) * TAB_FADE_OUT_AT);
    values.push(curve(t));
  }
  magnitudes.reverse();
  values.reverse();
  magnitudes.push(1);
  values.push(0);
  return mirror(magnitudes, values);
}

/** translateY stops: the incoming screen eases from `TAB_RISE` to 0 over the whole transition. */
export function fadeThroughRiseStops(curve: (t: number) => number = enterCurve): Stops {
  const magnitudes: number[] = [];
  const values: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const m = i / SAMPLES;
    magnitudes.push(m);
    values.push(TAB_RISE * (1 - curve(1 - m)));
  }
  return mirror(magnitudes, values);
}

let stops: { opacity: Stops; rise: Stops } | undefined;

function forFadeThrough({ current }: BottomTabSceneInterpolationProps) {
  stops ??= { opacity: fadeThroughOpacityStops(), rise: fadeThroughRiseStops() };
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({ ...stops.opacity, extrapolate: 'clamp' }),
      transform: [{ translateY: current.progress.interpolate({ ...stops.rise, extrapolate: 'clamp' }) }],
    },
  };
}

function forReducedFade({ current }: BottomTabSceneInterpolationProps) {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
    },
  };
}

type TabTransitionOptions = Pick<BottomTabNavigationOptions, 'transitionSpec' | 'sceneStyleInterpolator'>;

/** `screenOptions` for the tabs navigator: fade-through, or a quick crossfade under Reduce Motion. */
export function tabTransitionOptions(reduceMotion: boolean): TabTransitionOptions {
  if (reduceMotion) {
    return {
      transitionSpec: { animation: 'timing', config: { duration: durations.quick, easing: Easing.linear } },
      sceneStyleInterpolator: forReducedFade,
    };
  }
  return {
    transitionSpec: { animation: 'timing', config: { duration: durations.base, easing: Easing.linear } },
    sceneStyleInterpolator: forFadeThrough,
  };
}
