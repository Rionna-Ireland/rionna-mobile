import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { cleanup, render, screen } from '@/lib/test-utils';

import {
  dashOffsetFor,
  floodOffsetFor,
  STROKE_FADE_START,
  strokeOpacityFor,
  strokePadUnits,
  submarkHeightFor,
} from './animated-submark-math';
import { SUBMARK_PATH, SUBMARK_PATH_LENGTH, SUBMARK_VIEWBOX } from './constants';
import { AnimatedSubmark } from './index';

afterEach(cleanup);

type Rendered = ReturnType<typeof render>;

function strokeProps(r: Rendered) {
  return r.UNSAFE_getAllByType(Path).find(p => p.props.testID === 'am-stroke')!.props.animatedProps;
}

function sv(value: number): SharedValue<number> {
  return { get: () => value, set: () => {}, value } as unknown as SharedValue<number>;
}

describe('animated submark maths', () => {
  it('draws from nothing to the full outline', () => {
    expect(dashOffsetFor(0)).toBe(SUBMARK_PATH_LENGTH);
    expect(dashOffsetFor(0.5)).toBe(SUBMARK_PATH_LENGTH / 2);
    expect(dashOffsetFor(1)).toBe(0);
    expect(dashOffsetFor(-1)).toBe(SUBMARK_PATH_LENGTH);
    expect(dashOffsetFor(2)).toBe(0);
  });

  it('keeps the stroke until the fill is well up, then fades it out', () => {
    expect(strokeOpacityFor(0)).toBe(1);
    expect(strokeOpacityFor(STROKE_FADE_START)).toBe(1);
    expect(strokeOpacityFor((1 + STROKE_FADE_START) / 2)).toBeCloseTo(0.5);
    expect(strokeOpacityFor(1)).toBe(0);
  });

  it('floods from the bottom', () => {
    expect(floodOffsetFor(0, 32)).toBe(32);
    expect(floodOffsetFor(0.25, 32)).toBe(24);
    expect(floodOffsetFor(1, 32)).toBe(0);
  });

  it('follows the viewBox aspect and pads for the stroke', () => {
    expect(submarkHeightFor(SUBMARK_VIEWBOX.width)).toBeCloseTo(SUBMARK_VIEWBOX.height);
    expect(strokePadUnits(SUBMARK_VIEWBOX.width, 2)).toBe(1);
  });
});

describe('animatedSubmark', () => {
  it('renders the one path twice (fill + stroke) at progress 0 with nothing drawn', () => {
    const { UNSAFE_getAllByType } = render(
      <AnimatedSubmark testID="am" progress={sv(0)} fillProgress={sv(0)} color={colors.ink} size={120} />,
    );
    expect(screen.getByTestId('am')).toBeOnTheScreen();
    const paths = UNSAFE_getAllByType(Path);
    expect(paths).toHaveLength(2);
    paths.forEach(p => expect(p.props.d).toBe(SUBMARK_PATH));
    expect(strokeProps({ UNSAFE_getAllByType } as Rendered)).toEqual({ strokeDashoffset: SUBMARK_PATH_LENGTH, strokeOpacity: 0 });
  });

  it('half-drawn stroke and an empty fill window', () => {
    const view = render(<AnimatedSubmark testID="am" progress={sv(0.5)} fillProgress={sv(0)} color={colors.ink} size={120} />);
    expect(strokeProps(view)).toEqual({
      strokeDashoffset: SUBMARK_PATH_LENGTH / 2,
      strokeOpacity: 1,
    });
    const fill = screen.getByTestId('am-fill');
    expect(fill).toHaveStyle({ transform: [{ translateY: submarkHeightFor(120) }] });
  });

  it('is fully filled with the stroke gone at the end', () => {
    const view = render(<AnimatedSubmark testID="am" progress={sv(1)} fillProgress={sv(1)} color={colors.ink} size={36} />);
    expect(strokeProps(view).strokeOpacity).toBe(0);
    expect(screen.getByTestId('am-fill')).toHaveStyle({ transform: [{ translateY: 0 }] });
  });
});
