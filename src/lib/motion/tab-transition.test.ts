import { Animated } from 'react-native';

import {
  fadeThroughOpacityStops,
  fadeThroughRiseStops,
  TAB_FADE_OUT_AT,
  TAB_RISE,
  tabTransitionOptions,
} from './tab-transition';
import { durations } from './tokens';

const linear = (t: number) => t;

function at(stops: { inputRange: number[]; outputRange: number[] }, p: number) {
  const i = stops.inputRange.indexOf(p);
  expect(i).toBeGreaterThanOrEqual(0);
  return stops.outputRange[i];
}

describe('tab fade-through stops', () => {
  it('fades the outgoing screen out by quick and keeps it hidden after', () => {
    const stops = fadeThroughOpacityStops(linear);
    expect(TAB_FADE_OUT_AT).toBeCloseTo(durations.quick / durations.base);
    expect(at(stops, 0)).toBe(1);
    expect(at(stops, TAB_FADE_OUT_AT)).toBe(0);
    expect(at(stops, -TAB_FADE_OUT_AT)).toBe(0);
    expect(at(stops, 1)).toBe(0);
    expect(at(stops, -1)).toBe(0);
  });

  it('has strictly increasing, symmetric input stops', () => {
    for (const stops of [fadeThroughOpacityStops(), fadeThroughRiseStops()]) {
      for (let i = 1; i < stops.inputRange.length; i++)
        expect(stops.inputRange[i]).toBeGreaterThan(stops.inputRange[i - 1]);
      const n = stops.inputRange.length;
      for (let i = 0; i < n; i++) {
        expect(stops.inputRange[i]).toBeCloseTo(-stops.inputRange[n - 1 - i]);
        expect(stops.outputRange[i]).toBeCloseTo(stops.outputRange[n - 1 - i]);
      }
    }
  });

  it('rises the incoming screen 6pt into place', () => {
    const stops = fadeThroughRiseStops(linear);
    expect(at(stops, 1)).toBe(TAB_RISE);
    expect(at(stops, 0)).toBe(0);
    expect(at(stops, 0.5)).toBeCloseTo(TAB_RISE / 2);
  });

  it('eases the incoming fade-in (decelerate: more than half visible at the midpoint)', () => {
    const stops = fadeThroughOpacityStops();
    const mid = stops.inputRange.reduce((best, p) =>
      Math.abs(p - TAB_FADE_OUT_AT / 2) < Math.abs(best - TAB_FADE_OUT_AT / 2) ? p : best);
    expect(at(stops, mid)).toBeGreaterThan(0.5);
  });
});

describe('tabTransitionOptions', () => {
  const progress = new Animated.Value(0);

  it('runs the fade-through on a linear base clock with a rise', () => {
    const options = tabTransitionOptions(false);
    expect(options.transitionSpec).toMatchObject({ animation: 'timing', config: { duration: durations.base } });
    const { sceneStyle } = options.sceneStyleInterpolator!({ current: { progress } });
    expect(sceneStyle).toHaveProperty('opacity');
    expect(sceneStyle).toHaveProperty('transform');
  });

  it('degrades to a quick opacity-only crossfade under Reduce Motion', () => {
    const options = tabTransitionOptions(true);
    expect(options.transitionSpec).toMatchObject({ animation: 'timing', config: { duration: durations.quick } });
    const { sceneStyle } = options.sceneStyleInterpolator!({ current: { progress } });
    expect(sceneStyle).toHaveProperty('opacity');
    expect(sceneStyle).not.toHaveProperty('transform');
  });
});
