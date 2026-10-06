import * as React from 'react';

import { cleanup, render, screen } from '@/lib/test-utils';

import { DOT_ACTIVE_WIDTH, DOT_INACTIVE_OPACITY, DOT_SIZE, dotMetrics } from './dot-metrics';
import { Dots } from './dots';

afterEach(cleanup);

describe('dotMetrics', () => {
  it('is a full pill on its page and a faded dot a page or more away', () => {
    expect(dotMetrics(2, 2)).toEqual({ width: DOT_ACTIVE_WIDTH, opacity: 1 });
    expect(dotMetrics(0, 2)).toEqual({ width: DOT_SIZE, opacity: DOT_INACTIVE_OPACITY });
    expect(dotMetrics(1, 2)).toEqual({ width: DOT_SIZE, opacity: DOT_INACTIVE_OPACITY });
  });

  it('interpolates linearly mid-drag, so the pill hands over with the finger', () => {
    const leaving = dotMetrics(0.25, 0);
    const arriving = dotMetrics(0.25, 1);
    expect(leaving.width).toBeCloseTo(13.5);
    expect(arriving.width).toBeCloseTo(8.5);
    expect(leaving.opacity).toBeCloseTo(0.825);
    expect(arriving.opacity).toBeCloseTo(0.475);
    // Halfway, both dots are the same size.
    expect(dotMetrics(0.5, 0)).toEqual(dotMetrics(0.5, 1));
  });
});

describe('dots', () => {
  it('renders one dot per page: a pill for the active page, faded dots for the rest', () => {
    render(<Dots testID="dots" count={3} index={1} />);
    expect(screen.getByTestId('dots-0')).toHaveStyle({ width: DOT_SIZE, opacity: DOT_INACTIVE_OPACITY });
    expect(screen.getByTestId('dots-1')).toHaveStyle({ width: DOT_ACTIVE_WIDTH, opacity: 1 });
    expect(screen.getByTestId('dots-2')).toHaveStyle({ width: DOT_SIZE, opacity: DOT_INACTIVE_OPACITY });
  });

  it('follows a live scroll position when one is passed', () => {
    const progress = { value: 1.5, get: () => 1.5, set: jest.fn() } as never;
    render(<Dots testID="dots" count={3} index={1} progress={progress} />);
    expect(screen.getByTestId('dots-1')).toHaveStyle({ width: 11 });
    expect(screen.getByTestId('dots-2')).toHaveStyle({ width: 11 });
    expect(screen.getByTestId('dots-0')).toHaveStyle({ width: DOT_SIZE });
  });

  it('exposes the position to screen readers', () => {
    render(<Dots testID="dots" count={3} index={0} />);
    expect(screen.getByTestId('dots').props.accessibilityValue).toMatchObject({ now: 1, max: 3 });
  });
});
