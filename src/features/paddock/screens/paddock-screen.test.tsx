import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PaddockHubView, PaddockScreen } from '@/features/paddock/screens/paddock-screen';

const mockMembership = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/auth/use-auth-store', () => ({
  useAuthStore: { use: { user: () => ({ id: 'member-1' }) } },
}));
jest.mock('@/features/paddock/api/use-offers', () => ({ useOffers: () => ({ data: { offers: [] }, isLoading: false }) }));
jest.mock('@/features/paddock/api/use-charity', () => ({ useCharity: () => ({ data: undefined, isLoading: false }) }));
jest.mock('@/features/settings/api/use-membership', () => ({ useMembership: (...args: unknown[]) => mockMembership(...args) }));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});
jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 70 }));
jest.mock('@/components/ui/tab-bar-layout', () => ({ useTabBarContentPadding: () => 120 }));

function renderHub(overrides: Partial<React.ComponentProps<typeof PaddockHubView>> = {}) {
  const props = {
    offersCount: 3,
    charitySummary: '\u20AC24,500 raised to date. Vote on what\u2019s next',
    onOpenBenefits: jest.fn(),
    onOpenCharity: jest.fn(),
    ...overrides,
  };
  render(<PaddockHubView {...props} />);
  return props;
}

describe('paddockHubView', () => {
  it('renders the heading and live rows, and navigates on press', () => {
    const { onOpenBenefits, onOpenCharity } = renderHub();
    expect(screen.getByText('Paddock')).toBeOnTheScreen();
    expect(screen.getByText('3 offers')).toBeOnTheScreen();
    expect(screen.getByText('\u20AC24,500 raised to date. Vote on what\u2019s next')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paddock-row-Membership Benefits'));
    fireEvent.press(screen.getByTestId('paddock-row-Charity Snapshot'));
    expect(onOpenBenefits).toHaveBeenCalledTimes(1);
    expect(onOpenCharity).toHaveBeenCalledTimes(1);
  });

  it('shows Merchandise as a disabled coming-soon row', () => {
    renderHub();
    expect(screen.getByText('Merchandise')).toBeOnTheScreen();
    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
    expect(screen.getByTestId('paddock-row-Merchandise')).toHaveProp('accessibilityState', { disabled: true });
  });

  it('does not render a Competitions row', () => {
    renderHub();
    expect(screen.queryByText('Competitions')).not.toBeOnTheScreen();
  });

  it('hides the journey card until a badge exists', () => {
    renderHub();
    expect(screen.queryByTestId('journey-card')).not.toBeOnTheScreen();
    expect(screen.queryByText('My Rionna journey')).not.toBeOnTheScreen();
  });

  it('shows the Founding Member badge when flagged', () => {
    renderHub({ badges: ['founding-member'] });
    expect(screen.getByTestId('journey-card')).toBeOnTheScreen();
    expect(screen.getByText('Founding Member')).toBeOnTheScreen();
  });

  it('falls back to the static benefits subtitle when unknown', () => {
    renderHub({ offersCount: null });
    expect(screen.getByText('Restaurants, hotels, lifestyle partners')).toBeOnTheScreen();
  });

  it('shows a subtitle skeleton while a row\'s count is on its first load', () => {
    renderHub({ offersCount: null, offersLoading: true });
    expect(screen.queryByText('Restaurants, hotels, lifestyle partners')).not.toBeOnTheScreen();
    expect(screen.getAllByLabelText('Loading')).toHaveLength(1);
    expect(screen.getByText('\u20AC24,500 raised to date. Vote on what\u2019s next')).toBeOnTheScreen();
  });
});

describe('paddockScreen journey card', () => {
  it('shows the Founding Member badge for a founding member', () => {
    mockMembership.mockReturnValue({ data: { since: '2026-03-02T00:00:00.000Z', foundingMember: true, status: 'active' } });
    render(<PaddockScreen />);
    expect(mockMembership).toHaveBeenCalledWith('member-1');
    expect(screen.getByTestId('badge-founding-member')).toBeOnTheScreen();
  });

  it('hides the journey card for a regular member or while loading', () => {
    mockMembership.mockReturnValue({ data: { since: null, foundingMember: false, status: 'active' } });
    const { rerender } = render(<PaddockScreen />);
    expect(screen.queryByTestId('journey-card')).not.toBeOnTheScreen();
    mockMembership.mockReturnValue({ data: undefined });
    rerender(<PaddockScreen />);
    expect(screen.queryByTestId('journey-card')).not.toBeOnTheScreen();
  });
});
