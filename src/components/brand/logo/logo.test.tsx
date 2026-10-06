import * as React from 'react';
import { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { cleanup, render, screen } from '@/lib/test-utils';

import { Submark, Wordmark, WordmarkLetters } from './index';

afterEach(cleanup);

describe('logo', () => {
  it('renders the wordmark', () => {
    render(<Wordmark testID="wm" width={200} color={colors.white} />);
    expect(screen.getByTestId('wm')).toBeOnTheScreen();
  });

  it('renders the submark as a single path', () => {
    const { UNSAFE_getAllByType } = render(<Submark testID="sm" height={40} />);
    expect(screen.getByTestId('sm')).toBeOnTheScreen();
    expect(UNSAFE_getAllByType(Path)).toHaveLength(1);
  });

  it('defaults to ink and preserves aspect ratio', () => {
    const { UNSAFE_getByType } = render(<Submark width={440.19} />);
    expect(UNSAFE_getByType(Path).props.fill).toBe(colors.ink);
  });

  it('wordmark letters drop the head and keep the letters\' aspect', () => {
    const { UNSAFE_getByType } = render(<WordmarkLetters testID="wl" height={33.77} />);
    const path = UNSAFE_getByType(Path);
    expect(path.props.d.startsWith('M786.876')).toBe(true);
    expect(screen.getByTestId('wl').props.width).toBeCloseTo(162, 0);
  });
});
