import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { cleanup, render, screen } from '@/lib/test-utils';

import { CollapsingTitle, CompactHeaderBar } from './scroll-header';
import { LARGE_TITLE_MIN_SCALE } from './scroll-header-math';

jest.mock('./screen-layout', () => ({ useScreenTopPadding: jest.fn(() => 47) }));

afterEach(cleanup);

function offset(y: number) {
  return { get: () => y } as unknown as SharedValue<number>;
}

describe('compactHeaderBar', () => {
  it('is invisible at rest', () => {
    render(<CompactHeaderBar testID="bar" scrollY={offset(0)} title="Stables" />);
    expect(screen.getByTestId('bar-chrome')).toHaveStyle({ opacity: 0 });
  });

  it('fades the chrome in over 60pt and the title over the second half', () => {
    const { rerender } = render(<CompactHeaderBar testID="bar" scrollY={offset(30)} title="Stables" />);
    expect(screen.getByTestId('bar-chrome')).toHaveStyle({ opacity: 0.5 });
    rerender(<CompactHeaderBar testID="bar" scrollY={offset(60)} title="Stables" />);
    expect(screen.getByTestId('bar-chrome')).toHaveStyle({ opacity: 1 });
    expect(screen.getByText('Stables', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('follows an explicit progress value over the scroll offset', () => {
    render(<CompactHeaderBar testID="bar" progress={offset(0.25)} scrollY={offset(600)} />);
    expect(screen.getByTestId('bar-chrome')).toHaveStyle({ opacity: 0.25 });
  });
});

describe('collapsingTitle', () => {
  it('fades and shrinks the large title as it collapses', () => {
    render(<CollapsingTitle scrollY={offset(60)}><Text>Stables</Text></CollapsingTitle>);
    const view = screen.getByText('Stables').parent!.parent!;
    expect(view).toHaveStyle({ opacity: 0, transform: [{ scale: LARGE_TITLE_MIN_SCALE }] });
  });

  it('only fades under Reduce Motion', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<CollapsingTitle scrollY={offset(60)}><Text>Stables</Text></CollapsingTitle>);
    const view = screen.getByText('Stables').parent!.parent!;
    expect(view).toHaveStyle({ opacity: 0, transform: [{ scale: 1 }] });
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });
});
