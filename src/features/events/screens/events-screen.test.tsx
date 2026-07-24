import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { EventsScreen } from '@/features/events/screens/events-screen';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

describe('eventsScreen', () => {
  it('renders the category chips and the empty state', () => {
    render(<EventsScreen />);

    for (const category of [
      'All',
      'Race days',
      'Stable visits',
      'Brunches',
      'Charity',
      'Networking',
    ]) {
      expect(screen.getByText(category)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('events-empty')).toBeOnTheScreen();
  });
});
