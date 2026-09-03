import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PaddockHubView } from '@/features/paddock/screens/paddock-screen';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});
jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 70 }));
jest.mock('@/components/ui/tab-bar-layout', () => ({ useTabBarContentPadding: () => 120 }));

function renderHub(overrides: Partial<React.ComponentProps<typeof PaddockHubView>> = {}) {
  const props = {
    offersCount: 3,
    charitySummary: '€24,500 raised for Irish Injured Jockeys',
    onOpenBenefits: jest.fn(),
    onOpenCharity: jest.fn(),
    ...overrides,
  };
  render(<PaddockHubView {...props} />);
  return props;
}

describe('paddockHubView', () => {
  it('renders live rows with summaries and navigates on press', () => {
    const { onOpenBenefits, onOpenCharity } = renderHub();
    expect(screen.getByText('3 offers')).toBeOnTheScreen();
    expect(screen.getByText('€24,500 raised for Irish Injured Jockeys')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paddock-row-Member benefits'));
    fireEvent.press(screen.getByTestId('paddock-row-Charity impact'));
    expect(onOpenBenefits).toHaveBeenCalledTimes(1);
    expect(onOpenCharity).toHaveBeenCalledTimes(1);
  });

  it('falls back to static subtitles while summaries are unknown', () => {
    renderHub({ offersCount: null, charitySummary: null });
    expect(screen.getByText('Restaurant, hotel and lifestyle partners')).toBeOnTheScreen();
    expect(screen.getByText('Total donated, voting and impact stories')).toBeOnTheScreen();
  });

  it('keeps the deferred rows labelled coming soon', () => {
    renderHub();
    for (const title of ['My Rionna journey', 'Merchandise', 'Competitions']) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
  });

  it('pluralises a single offer', () => {
    renderHub({ offersCount: 1 });
    expect(screen.getByText('1 offer')).toBeOnTheScreen();
  });

  it('falls back to the static subtitle when there are no offers', () => {
    renderHub({ offersCount: 0 });
    expect(screen.getByText('Restaurant, hotel and lifestyle partners')).toBeOnTheScreen();
    expect(screen.queryByText('0 offers')).not.toBeOnTheScreen();
  });
});
