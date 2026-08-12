import type { HorseUpdate } from '@/features/stables/types';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { HorseUpdatesTimeline } from '@/features/stables/components/horse-updates-timeline';

function makeUpdate(overrides: Partial<HorseUpdate>): HorseUpdate {
  return {
    id: 'update-1',
    updateType: 'wellbeing',
    title: 'All clear',
    bodyText: 'Routine checkup, all clear.',
    publishedAt: '2026-08-01T00:00:00.000Z',
    circlePostId: 'post-1',
    ...overrides,
  };
}

describe('horseUpdatesTimeline', () => {
  it('renders nothing when there are no updates', () => {
    const { toJSON } = render(<HorseUpdatesTimeline updates={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when updates is undefined', () => {
    const { toJSON } = render(<HorseUpdatesTimeline updates={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('renders a type chip, title, and body for each entry', () => {
    render(
      <HorseUpdatesTimeline
        updates={[
          makeUpdate({ id: 'update-1', updateType: 'wellbeing', title: 'All clear', bodyText: 'Routine checkup, all clear.' }),
          makeUpdate({ id: 'update-2', updateType: 'trainer', title: 'Strong session', bodyText: 'Strong gallop session.' }),
        ]}
      />,
    );

    expect(screen.getByText('Wellbeing')).toBeOnTheScreen();
    expect(screen.getByText('All clear')).toBeOnTheScreen();
    expect(screen.getByText('Routine checkup, all clear.')).toBeOnTheScreen();
    expect(screen.getByText('Trainer')).toBeOnTheScreen();
    expect(screen.getByText('Strong session')).toBeOnTheScreen();
    expect(screen.getByText('Strong gallop session.')).toBeOnTheScreen();
  });

  it('renders a "Race notes" chip for race-type entries', () => {
    render(
      <HorseUpdatesTimeline
        updates={[makeUpdate({ updateType: 'race', title: 'Race day', bodyText: 'Ran well, finished 3rd.' })]}
      />,
    );

    expect(screen.getByText('Race notes')).toBeOnTheScreen();
  });

  it('renders general-type entries with a "General" chip', () => {
    render(
      <HorseUpdatesTimeline
        updates={[makeUpdate({ updateType: 'general', title: 'Update', bodyText: 'General news.' })]}
      />,
    );

    expect(screen.getByText('General')).toBeOnTheScreen();
  });

  it('renders no type chip when updateType is null', () => {
    render(
      <HorseUpdatesTimeline
        updates={[makeUpdate({ updateType: null, title: 'Untyped update', bodyText: 'No category on this one.' })]}
      />,
    );

    expect(screen.queryByText('Trainer')).toBeNull();
    expect(screen.queryByText('Wellbeing')).toBeNull();
    expect(screen.queryByText('General')).toBeNull();
    expect(screen.queryByText('Race notes')).toBeNull();
    expect(screen.getByText('Untyped update')).toBeOnTheScreen();
  });

  it('shows a "Read more" toggle for long body text and expands it on tap', () => {
    const longBody = 'A'.repeat(300);
    render(
      <HorseUpdatesTimeline
        updates={[makeUpdate({ title: 'Long update', bodyText: longBody })]}
      />,
    );

    const readMore = screen.getByText('Read more');
    expect(readMore).toBeOnTheScreen();

    fireEvent.press(readMore);
    expect(screen.getByText('Show less')).toBeOnTheScreen();
  });

  it('does not show a "Read more" toggle for short body text', () => {
    render(
      <HorseUpdatesTimeline
        updates={[makeUpdate({ title: 'Short update', bodyText: 'Short and sweet.' })]}
      />,
    );

    expect(screen.queryByText('Read more')).toBeNull();
  });
});
