import * as React from 'react';

import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { StatusFilterChips } from './status-filter-chips';

afterEach(cleanup);

describe('statusFilterChips', () => {
  it('does not render a "Declared" chip, since DECLARED has no matching horse.status', () => {
    render(<StatusFilterChips value="ALL" onChange={jest.fn()} />);
    expect(screen.queryByText('Declared')).not.toBeOnTheScreen();
  });

  it('renders the working filters', () => {
    render(<StatusFilterChips value="ALL" onChange={jest.fn()} />);
    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.getByText('In training')).toBeOnTheScreen();
    expect(screen.getByText('Pre-training')).toBeOnTheScreen();
    expect(screen.getByText('Retired')).toBeOnTheScreen();
  });

  it('calls onChange with the selected filter value', async () => {
    const onChange = jest.fn();
    const { user } = setup(<StatusFilterChips value="ALL" onChange={onChange} />);
    await user.press(screen.getByText('Retired'));
    expect(onChange).toHaveBeenCalledWith('RETIRED');
  });
});
