import { act, render, renderHook, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import {
  ENTRANCE_RISE,
  ENTRANCE_WINDOW_MS,
  entranceFor,
  EntranceItem,
  fadeUpEntering,
  reducedFadeEntering,
  useFirstLoadEntrance,
} from './entrance';
import { durations, stagger } from './tokens';

type Anim = { initialValues: Record<string, unknown>; animations: Record<string, unknown> };
const run = (fn: unknown) => (fn as () => Anim)();

describe('entranceFor', () => {
  it('animates the first stagger.maxItems items and nothing past the cap', () => {
    for (let i = 0; i < stagger.maxItems; i++)
      expect(entranceFor(i, false)).toBeDefined();
    expect(entranceFor(stagger.maxItems, false)).toBeUndefined();
    expect(entranceFor(stagger.maxItems + 10, false)).toBeUndefined();
    expect(entranceFor(-1, false)).toBeUndefined();
  });

  it('fades up from ENTRANCE_RISE', () => {
    const anim = run(fadeUpEntering(2));
    expect(anim.initialValues).toEqual({ opacity: 0, transform: [{ translateY: ENTRANCE_RISE }] });
    expect(anim.animations).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it('under Reduce Motion is an opacity fade with no rise', () => {
    const anim = run(entranceFor(3, true));
    expect(anim.initialValues).toEqual({ opacity: 0 });
    expect(anim.animations).toEqual({ opacity: 1 });
    expect(run(reducedFadeEntering()).initialValues).not.toHaveProperty('transform');
  });

  it('keeps the window open for the last stagger slot plus one base entrance', () => {
    expect(ENTRANCE_WINDOW_MS).toBe((stagger.maxItems - 1) * stagger.step + durations.base);
  });
});

describe('useFirstLoadEntrance', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('gives no entrance before the data is ready', () => {
    const { result } = renderHook(() => useFirstLoadEntrance(false));
    expect(result.current(0)).toBeUndefined();
  });

  it('animates the first batch, then never again (refetch, re-render, pagination)', () => {
    const { result, rerender } = renderHook(({ ready }: { ready: boolean }) => useFirstLoadEntrance(ready), {
      initialProps: { ready: false },
    });
    rerender({ ready: true });
    expect(result.current(0)).toBeDefined();
    expect(result.current(stagger.maxItems)).toBeUndefined();

    act(() => jest.advanceTimersByTime(ENTRANCE_WINDOW_MS));
    expect(result.current(0)).toBeUndefined();

    // A refetch (ready flips off and on) or a plain re-render doesn't reopen it.
    rerender({ ready: false });
    rerender({ ready: true });
    expect(result.current(0)).toBeUndefined();
    expect(result.current(1)).toBeUndefined();
  });

  it('opens on the very first render when the data is already cached', () => {
    const { result } = renderHook(() => useFirstLoadEntrance(true));
    expect(result.current(0)).toBeDefined();
  });

  it('uses the reduced fade under Reduce Motion', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { result } = renderHook(() => useFirstLoadEntrance(true));
    expect(run(result.current(0)).initialValues).toEqual({ opacity: 0 });
  });
});

function Feed({ ready, rows }: { ready: boolean; rows: string[] }) {
  const entering = useFirstLoadEntrance(ready);
  return (
    <>
      {rows.map((row, i) => (
        <EntranceItem key={row} testID={`row-${row}`} entering={entering(i)}>
          <Text>{row}</Text>
        </EntranceItem>
      ))}
    </>
  );
}

describe('entranceItem in a list', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('rows mounted after the first load (pagination) mount without an entrance', () => {
    const first = ['a', 'b'];
    const { rerender } = render(<Feed ready rows={first} />);
    expect(screen.getByTestId('row-a').props.entering).toBeDefined();

    act(() => jest.advanceTimersByTime(ENTRANCE_WINDOW_MS));
    rerender(<Feed ready rows={[...first, 'c']} />);
    expect(screen.getByTestId('row-c').props.entering).toBeUndefined();
  });
});
