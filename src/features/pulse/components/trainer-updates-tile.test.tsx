import type { TrainerUpdate } from '@/features/pulse/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { TrainerUpdatesTile } from '@/features/pulse/components/trainer-updates-tile';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeUpdate(overrides: Partial<TrainerUpdate> = {}): TrainerUpdate {
  return {
    id: 'mp-1',
    horseId: 'horse-1',
    horseName: 'Storm Chaser',
    title: 'Great work this week',
    bodyText: 'Going really well this week, ready for Saturday.',
    publishedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('trainerUpdatesTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the empty state when there are no updates', () => {
    render(<TrainerUpdatesTile data={[]} isLoading={false} />);

    expect(screen.getByText('No trainer updates yet')).toBeOnTheScreen();
  });

  it('shows the empty state when data is undefined', () => {
    render(<TrainerUpdatesTile data={undefined} isLoading={false} />);

    expect(screen.getByText('No trainer updates yet')).toBeOnTheScreen();
  });

  it('renders a row per update with horse name and excerpt', () => {
    render(
      <TrainerUpdatesTile
        data={[
          makeUpdate({ id: 'mp-1', horseName: 'Storm Chaser', bodyText: 'Short body.' }),
          makeUpdate({ id: 'mp-2', horseName: 'Comet', bodyText: 'Another update body.' }),
        ]}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Storm Chaser')).toBeOnTheScreen();
    expect(screen.getByText('Short body.')).toBeOnTheScreen();
    expect(screen.getByText('Comet')).toBeOnTheScreen();
    expect(screen.getByText('Another update body.')).toBeOnTheScreen();
  });

  it('truncates a long excerpt to 80 characters', () => {
    const longBody = 'x'.repeat(120);
    render(<TrainerUpdatesTile data={[makeUpdate({ bodyText: longBody })]} isLoading={false} />);

    expect(screen.getByText(`${'x'.repeat(80)}...`)).toBeOnTheScreen();
  });

  it('navigates to the native horse profile when a row is pressed', () => {
    render(
      <TrainerUpdatesTile
        data={[makeUpdate({ horseId: 'horse-42', bodyText: 'Body text.' })]}
        isLoading={false}
      />,
    );

    fireEvent.press(screen.getByText('Body text.'));

    expect(mockPush).toHaveBeenCalledWith('/stables/horse-42');
  });
});
