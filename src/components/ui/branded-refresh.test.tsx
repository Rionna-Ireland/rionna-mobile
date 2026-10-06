import type * as ReactNative from 'react-native';
import type * as BrandedRefresh from './branded-refresh';
import { render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Platform, RefreshControl } from 'react-native';
import { useAnimatedReaction, useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated';

import { Path } from 'react-native-svg';

import { timings } from '@/lib/motion';
import { BrandedRefreshControl, RefreshIndicator } from './branded-refresh';
import colors from './colors';
import { crossThreshold, pullProgress, REFRESH_PULL_THRESHOLD } from './refresh-math';

const mockSelection = jest.fn();
jest.mock('@/lib/motion/haptics', () => ({
  ...jest.requireActual('@/lib/motion/haptics'),
  selection: () => mockSelection(),
}));

type BrandedRefreshModule = typeof BrandedRefresh;
type ReactNativeModule = typeof ReactNative;

const HIDDEN = { includeHiddenElements: true };

function strokeOffset(r: ReturnType<typeof render>): number {
  return r.UNSAFE_getAllByType(Path).find(p => p.props.testID === 'refresh-indicator-mark-stroke')!.props.animatedProps.strokeDashoffset;
}

function scroll(y: number) {
  return { value: y, get: () => y, set: jest.fn() } as never;
}

describe('refresh maths', () => {
  it('maps the pull to outline progress over 0→80pt', () => {
    expect(REFRESH_PULL_THRESHOLD).toBe(80);
    expect(pullProgress(0)).toBe(0);
    expect(pullProgress(120)).toBe(0); // scrolled down the page, not pulling
    expect(pullProgress(-20)).toBe(0.25);
    expect(pullProgress(-40)).toBe(0.5);
    expect(pullProgress(-80)).toBe(1);
    expect(pullProgress(-140)).toBe(1);
  });

  it('latches the threshold once per pull and re-arms only back at rest', () => {
    let latched = false;
    const fired: number[] = [];
    // Pull past the threshold, wobble around it, hold open while refreshing, settle, pull again.
    for (const y of [-10, -60, -81, -70, -95, -60, -30, 0, -40, -85, 0]) {
      const next = crossThreshold(latched, y);
      latched = next.latched;
      if (next.fire)
        fired.push(y);
    }
    expect(fired).toEqual([-81, -85]);
  });
});

describe('refreshIndicator (iOS)', () => {
  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.mocked(useAnimatedReaction).mockClear();
    jest.mocked(withRepeat).mockClear();
    mockSelection.mockClear();
  });

  it('fires one selection() haptic per pull from the scroll reaction', () => {
    render(<RefreshIndicator scrollY={scroll(0)} refreshing={false} top={50} />);
    const [, react] = jest.mocked(useAnimatedReaction).mock.calls.at(-1)!;
    for (const y of [-30, -79, -80, -100, -80, -90, -20])
      react(y, null);
    expect(mockSelection).toHaveBeenCalledTimes(1);
    react(0, null);
    react(-82, null);
    expect(mockSelection).toHaveBeenCalledTimes(2);
  });

  it('draws the outline with the pull and fades in with it', () => {
    const view = render(<RefreshIndicator scrollY={scroll(-40)} refreshing={false} top={50} />);
    expect(screen.getByTestId('refresh-indicator', HIDDEN)).toHaveStyle({ opacity: 0.5, top: 50 });
    expect(strokeOffset(view)).toBeGreaterThan(0);
  });

  it('fills and breathes while refreshing', () => {
    jest.mocked(withTiming).mockClear();
    render(<RefreshIndicator scrollY={scroll(-60)} refreshing top={50} />);
    expect(withTiming).toHaveBeenCalledWith(1, timings.crossfade);
    expect(withTiming).toHaveBeenCalledWith(0.6, timings.breathe);
    expect(withRepeat).toHaveBeenCalledWith(0.6, -1, true);
  });

  it('under Reduce Motion appears filled, with no draw and no breathing', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = render(<RefreshIndicator scrollY={scroll(-20)} refreshing={false} top={50} />);
    expect(withRepeat).not.toHaveBeenCalled();
    expect(strokeOffset(view)).toBe(0);
  });

  it('hides the native spinner on iOS but keeps the control', () => {
    const onRefresh = jest.fn();
    const view = render(<BrandedRefreshControl refreshing={false} onRefresh={onRefresh} />);
    const native = view.UNSAFE_getByType(RefreshControl);
    expect(native.props.tintColor).toBe('transparent');
    expect(native.props.onRefresh).toBe(onRefresh);
  });
});

describe('android', () => {
  const original = Platform.OS;
  beforeEach(() => {
    jest.resetModules();
    Platform.OS = 'android';
  });
  afterEach(() => {
    Platform.OS = original;
  });

  it('keeps the native spinner tinted primary and draws no overlay', () => {
    // Re-import under Android so the platform switch is re-evaluated.
    const mod = require('./branded-refresh') as BrandedRefreshModule;
    const RN = require('react-native') as ReactNativeModule;
    const { toJSON, UNSAFE_getByType } = render(<mod.BrandedRefreshControl refreshing={false} onRefresh={jest.fn()} />);
    expect(toJSON()).not.toBeNull();
    expect(UNSAFE_getByType(RN.RefreshControl).props.colors).toEqual([colors.primary]);
    const view = render(<mod.RefreshIndicator scrollY={scroll(-50)} refreshing top={0} />);
    expect(view.toJSON()).toBeNull();
  });
});
