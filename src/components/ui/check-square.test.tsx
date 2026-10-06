import * as React from 'react';
import { useAnimatedProps, useReducedMotion, withTiming } from 'react-native-reanimated';

import { timings } from '@/lib/motion';
import { cleanup, render, screen } from '@/lib/test-utils';

import { CheckSquare } from './check-square';

/** Mirrors the tick's stroke length in check-square.tsx. */
const CHECK_LENGTH = 18;

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

function lastDashOffset() {
  const calls = jest.mocked(useAnimatedProps).mock.results;
  return (calls.at(-1)?.value as { strokeDashoffset: number }).strokeDashoffset;
}

describe('checkSquare', () => {
  it('shows the fill and a fully drawn tick when checked', () => {
    render(<CheckSquare testID="sq" checked />);
    expect(screen.getByTestId('sq-fill', { includeHiddenElements: true })).toHaveStyle({ opacity: 1 });
    expect(lastDashOffset()).toBe(0);
  });

  it('hides the fill and the tick (dash offset = length) when unchecked', () => {
    render(<CheckSquare testID="sq" checked={false} />);
    expect(screen.getByTestId('sq-fill', { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
    expect(lastDashOffset()).toBe(CHECK_LENGTH);
  });

  it('draws over quick on change, and flips instantly under Reduce Motion', () => {
    const { rerender } = render(<CheckSquare checked={false} />);
    rerender(<CheckSquare checked />);
    expect(withTiming).toHaveBeenCalledWith(1, timings.quick);
    jest.mocked(withTiming).mockClear();
    jest.mocked(useReducedMotion).mockReturnValue(true);
    rerender(<CheckSquare checked={false} />);
    expect(withTiming).not.toHaveBeenCalled();
  });
});
