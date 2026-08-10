import type { WellbeingUpdate } from '@/features/stables/types';

import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { WellbeingTimeline } from '@/features/stables/components/wellbeing-timeline';

function makeUpdate(overrides: Partial<WellbeingUpdate>): WellbeingUpdate {
  return {
    id: 'wb-1',
    horseId: 'horse-1',
    organizationId: 'org-1',
    type: 'VET',
    body: 'Routine checkup, all clear.',
    publishedAt: '2026-08-01T00:00:00.000Z',
    notifyMembers: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('wellbeingTimeline', () => {
  it('renders nothing when there are no updates', () => {
    const { toJSON } = render(<WellbeingTimeline updates={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when updates is undefined', () => {
    const { toJSON } = render(<WellbeingTimeline updates={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('excludes unpublished entries as a defence-in-depth guard', () => {
    render(
      <WellbeingTimeline
        updates={[makeUpdate({ id: 'wb-draft', publishedAt: null, body: 'Draft note' })]}
      />,
    );

    expect(screen.queryByText('Draft note')).toBeNull();
  });

  it('renders a type chip and body for each published entry', () => {
    render(
      <WellbeingTimeline
        updates={[
          makeUpdate({ id: 'wb-1', type: 'VET', body: 'Routine checkup, all clear.' }),
          makeUpdate({ id: 'wb-2', type: 'TRAINING', body: 'Strong gallop session.' }),
        ]}
      />,
    );

    expect(screen.getByText('Vet')).toBeOnTheScreen();
    expect(screen.getByText('Routine checkup, all clear.')).toBeOnTheScreen();
    expect(screen.getByText('Training')).toBeOnTheScreen();
    expect(screen.getByText('Strong gallop session.')).toBeOnTheScreen();
  });
});
