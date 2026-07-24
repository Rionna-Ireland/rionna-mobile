import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PaddockScreen } from '@/features/paddock/screens/paddock-screen';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

jest.mock('@/components/ui/screen-layout', () => ({
  useScreenTopPadding: () => 70,
}));

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

describe('paddockScreen', () => {
  it('renders the phase-1 hub rows only', () => {
    render(<PaddockScreen />);

    for (const title of ['My Rionna journey', 'Member benefits', 'Charity impact']) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
    // Phase 2 with the client — must not render yet.
    for (const title of ['Merchandise', 'Partner offers', 'Competitions']) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it('labels every row coming soon', () => {
    render(<PaddockScreen />);

    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
  });
});
