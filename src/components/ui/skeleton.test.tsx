import { render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { useReducedMotion, withRepeat } from 'react-native-reanimated';

import colors from './colors';
import { withAlpha } from './gradient-styles';
import { shimmerBandStyle, shimmerOffset, Skeleton, SkeletonGroup, SkeletonText, SkeletonTone } from './skeleton';

function flat(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;
}

describe('skeleton', () => {
  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.mocked(withRepeat).mockClear();
  });

  it('is cream on light surfaces and white @8% inside a dark tone', () => {
    render(
      <>
        <Skeleton testID="light" height={10} />
        <SkeletonTone value="dark"><Skeleton testID="dark" height={10} /></SkeletonTone>
      </>,
    );
    expect(flat(screen.getByTestId('light').props.style).backgroundColor).toBe(colors.secondaryContainer);
    expect(flat(screen.getByTestId('dark').props.style).backgroundColor).toBe(withAlpha(colors.white, 0.08));
  });

  it('sweeps a translating gradient band on a repeating shimmer clock', () => {
    render(
      <SkeletonGroup>
        <Skeleton height={10} />
        <Skeleton height={10} />
      </SkeletonGroup>,
    );
    expect(screen.getAllByTestId('skeleton-shimmer')).toHaveLength(2);
    // One clock for the whole group, not one per shape.
    expect(withRepeat).toHaveBeenCalledTimes(1);
    expect(flat(screen.getAllByTestId('skeleton-shimmer')[0].props.style).experimental_backgroundImage)
      .toContain('linear-gradient(to right');
  });

  it('is static under Reduce Motion: no band, no clock', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<SkeletonGroup><Skeleton height={10} /></SkeletonGroup>);
    expect(screen.queryByTestId('skeleton-shimmer')).toBeNull();
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('moves the band from fully left of the shape to fully right', () => {
    expect(shimmerOffset(0, 200)).toBe(-200);
    expect(shimmerOffset(0.5, 200)).toBe(0);
    expect(shimmerOffset(1, 200)).toBe(200);
    expect(shimmerBandStyle('light').experimental_backgroundImage).toContain(withAlpha(colors.white, 0.55));
  });

  it('skeletonText occupies the text variant\'s line boxes plus display descender padding', () => {
    render(<SkeletonText testID="t" variant="display-sm" lines={2} />);
    const box = screen.getByTestId('t');
    // display-sm: 24pt lines, ceil(21 × 0.15) = 4pt descender padding below the last.
    expect(flat(box.props.style).paddingBottom).toBe(4);
    expect(box.children).toHaveLength(2);
  });

  it('announces a group once as loading', () => {
    render(<SkeletonGroup testID="g"><Skeleton height={10} /></SkeletonGroup>);
    expect(screen.getByTestId('g').props.accessibilityLabel).toBe('Loading');
  });
});
