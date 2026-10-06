import * as React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { act, cleanup, render, screen } from '@/lib/test-utils';

import { NumberRoll } from './number-roll';
import { diffRoll, hasRoll, rollDirection } from './number-roll-diff';

afterEach(cleanup);

describe('diffRoll', () => {
  it('marks only the digits that change; text and unchanged digits stay', () => {
    expect(diffRoll('37 going', '38 going')).toEqual([
      { kind: 'digit', from: '3', to: '3' },
      { kind: 'digit', from: '7', to: '8' },
      { kind: 'text', text: ' going' },
    ]);
  });

  it('right-aligns digit runs so a new column appears on the left', () => {
    expect(diffRoll('9', '10')).toEqual([
      { kind: 'digit', from: '', to: '1' },
      { kind: 'digit', from: '9', to: '0' },
    ]);
    expect(diffRoll('10', '9')).toEqual([
      { kind: 'digit', from: '1', to: '' },
      { kind: 'digit', from: '0', to: '9' },
    ]);
  });

  it('handles several numbers ("N of M")', () => {
    expect(diffRoll('3 of 20', '2 of 20')).toEqual([
      { kind: 'digit', from: '3', to: '2' },
      { kind: 'text', text: ' of ' },
      { kind: 'digit', from: '2', to: '2' },
      { kind: 'digit', from: '0', to: '0' },
    ]);
  });

  it('refuses to roll when the words around the number change', () => {
    expect(diffRoll('1 like', '2 likes')).toBeNull();
    expect(diffRoll('5', 'Full')).toBeNull();
  });

  it('hasRoll is false when nothing changed or the diff failed', () => {
    expect(hasRoll(diffRoll('12', '12'))).toBe(false);
    expect(hasRoll(null)).toBe(false);
    expect(hasRoll(diffRoll('12', '13'))).toBe(true);
  });

  it('rolls up on increase and down on decrease, by the first differing number', () => {
    expect(rollDirection('9', '10')).toBe(1);
    expect(rollDirection('10', '9')).toBe(-1);
    expect(rollDirection('3 of 20', '2 of 20')).toBe(-1);
  });
});

describe('numberRoll', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('renders the value as one text at rest', () => {
    render(<NumberRoll testID="n" value={37} />);
    expect(screen.getByTestId('n')).toHaveTextContent('37');
  });

  it('splits into columns while rolling, then settles back to one text', () => {
    jest.useFakeTimers();
    const { rerender } = render(<NumberRoll testID="n" value="37 going" />);
    rerender(<NumberRoll testID="n" value="38 going" />);
    const rolling = screen.getByTestId('n');
    expect(rolling.props.accessibilityLabel).toBe('38 going');
    expect(screen.getByText('8')).toBeOnTheScreen();
    expect(screen.queryByText('7')).toBeNull(); // outgoing digit is hidden from a11y
    act(() => jest.runAllTimers());
    expect(screen.getByTestId('n')).toHaveTextContent('38 going');
    expect(screen.queryByText('8')).toBeNull();
  });

  it('swaps instantly under Reduce Motion', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { rerender } = render(<NumberRoll testID="n" value={9} />);
    rerender(<NumberRoll testID="n" value={10} />);
    expect(screen.getByText('10')).toBeOnTheScreen();
  });
});
