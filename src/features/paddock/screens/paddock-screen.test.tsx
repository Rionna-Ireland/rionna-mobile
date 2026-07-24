import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PaddockScreen } from '@/features/paddock/screens/paddock-screen';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

describe('paddockScreen', () => {
  it('renders every hub row from the wireframe', () => {
    render(<PaddockScreen />);

    for (const title of [
      'My Rionna journey',
      'Member benefits',
      'Merchandise',
      'Partner offers',
      'Charity impact',
      'Competitions',
    ]) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
  });

  it('marks Competitions as future, everything else coming soon', () => {
    render(<PaddockScreen />);

    expect(screen.getByText('Future')).toBeOnTheScreen();
    expect(screen.getAllByText('Coming soon')).toHaveLength(5);
  });
});
