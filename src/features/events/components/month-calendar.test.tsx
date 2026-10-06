import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import colors from '@/components/ui/colors';

import { MonthCalendar } from './month-calendar';

const mockSelection = jest.fn();
jest.mock('@/lib/motion/haptics', () => ({
  ...jest.requireActual('@/lib/motion/haptics'),
  selection: () => mockSelection(),
}));

type Anim = { initialValues: Record<string, unknown> };
function gridEntering() {
  const entering = screen.getByTestId('month-calendar-grid').props.entering as (() => Anim) | undefined;
  return entering?.();
}

const base = {
  month: { year: 2026, month: 6 },
  today: new Date(2026, 6, 2),
  onPrevMonth: jest.fn(),
  onNextMonth: jest.fn(),
  onSelectDay: jest.fn(),
};

describe('monthCalendar', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.mocked(useReducedMotion).mockReturnValue(false));

  it('renders the month title and a Monday-first weekday row', () => {
    render(<MonthCalendar {...base} eventDays={new Map()} />);
    expect(screen.getByTestId('month-calendar-title')).toHaveTextContent('July 2026');
    expect(screen.getByTestId('month-calendar-day-2026-06-29')).toBeOnTheScreen();
  });

  it('fills event days with the supplied colour and outlines today', () => {
    render(<MonthCalendar {...base} eventDays={new Map([['2026-07-04', colors.onPrimaryContainer]])} />);
    expect(screen.getByTestId('month-calendar-day-2026-07-04')).toHaveStyle({ backgroundColor: colors.onPrimaryContainer });
    expect(screen.getByTestId('month-calendar-day-2026-07-03')).not.toHaveStyle({ backgroundColor: colors.onPrimaryContainer });
    expect(screen.getByLabelText('Thursday 2 July, today')).toBeOnTheScreen();
  });

  it('reads days as human dates with their event count (A-022)', () => {
    const fill = colors.onPrimaryContainer;
    render(
      <MonthCalendar
        {...base}
        eventDays={new Map([['2026-07-04', fill], ['2026-07-18', fill]])}
        eventCounts={new Map([['2026-07-04', 1], ['2026-07-18', 2]])}
      />,
    );
    expect(screen.getByLabelText('Saturday 4 July, 1 event')).toBeOnTheScreen();
    expect(screen.getByLabelText('Saturday 18 July, 2 events')).toBeOnTheScreen();
  });

  it('pages months and reports day taps', () => {
    render(<MonthCalendar {...base} eventDays={new Map()} />);
    fireEvent.press(screen.getByTestId('month-calendar-next'));
    fireEvent.press(screen.getByTestId('month-calendar-prev'));
    fireEvent.press(screen.getByTestId('month-calendar-day-2026-07-10'));
    expect(base.onNextMonth).toHaveBeenCalledTimes(1);
    expect(base.onPrevMonth).toHaveBeenCalledTimes(1);
    expect(base.onSelectDay).toHaveBeenCalledWith('2026-07-10');
  });

  it('ticks a selection haptic when a day is tapped', () => {
    render(<MonthCalendar {...base} eventDays={new Map()} />);
    fireEvent.press(screen.getByTestId('month-calendar-day-2026-07-10'));
    expect(mockSelection).toHaveBeenCalledTimes(1);
  });

  it('slides a new month in from the side it came from, but not on first render', () => {
    const { rerender } = render(<MonthCalendar {...base} eventDays={new Map()} />);
    expect(gridEntering()).toBeUndefined();

    rerender(<MonthCalendar {...base} month={{ year: 2026, month: 7 }} eventDays={new Map()} />);
    expect(gridEntering()?.initialValues).toEqual({ opacity: 0, transform: [{ translateX: 32 }] });

    rerender(<MonthCalendar {...base} month={{ year: 2026, month: 6 }} eventDays={new Map()} />);
    expect(gridEntering()?.initialValues).toEqual({ opacity: 0, transform: [{ translateX: -32 }] });
  });

  it('crossfades months under Reduce Motion', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { rerender } = render(<MonthCalendar {...base} eventDays={new Map()} />);
    rerender(<MonthCalendar {...base} month={{ year: 2026, month: 7 }} eventDays={new Map()} />);
    expect(gridEntering()?.initialValues).toEqual({ opacity: 0 });
  });
});
