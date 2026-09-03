import type { OffersResult } from '@/features/paddock/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PaddockPreviewTile } from '@/features/home/components/paddock-preview-tile';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const DATA: OffersResult = {
  ok: true,
  offers: [{ id: 'o1', title: '15% off stays', partnerName: 'The Shelbourne', category: 'hotel', description: 'd', imageUrl: null, discountCode: null, redeemUrl: null, howToRedeem: null, validUntil: null }],
};

describe('paddockPreviewTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the newest offer and navigates on press', () => {
    render(<PaddockPreviewTile data={DATA} isLoading={false} />);
    expect(screen.getByText('15% off stays')).toBeOnTheScreen();
    expect(screen.getByText('The Shelbourne')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paddock-preview-tile'));
    expect(mockPush).toHaveBeenCalledWith('/paddock/benefits');
  });
  it('renders nothing when there are no offers', () => {
    render(<PaddockPreviewTile data={{ ok: true, offers: [] }} isLoading={false} />);
    expect(screen.queryByText('From the Paddock')).not.toBeOnTheScreen();
  });
  it('renders nothing on error/offline', () => {
    render(<PaddockPreviewTile data={undefined} isLoading={false} />);
    expect(screen.queryByText('From the Paddock')).not.toBeOnTheScreen();
  });
});
