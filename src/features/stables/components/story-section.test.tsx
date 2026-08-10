import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { StorySection } from '@/features/stables/components/story-section';

describe('storySection', () => {
  it('renders nothing when there is no story or pedigree', () => {
    const { toJSON } = render(<StorySection story={null} pedigree={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders a short story without a "Read more" toggle', () => {
    render(<StorySection story="A short and sweet story." pedigree={null} />);

    expect(screen.getByText('A short and sweet story.')).toBeOnTheScreen();
    expect(screen.queryByText('Read more')).toBeNull();
  });

  it('collapses a long story behind "Read more" and expands on tap', () => {
    const longStory = 'x'.repeat(400);
    render(<StorySection story={longStory} pedigree={null} />);

    expect(screen.getByText('Read more')).toBeOnTheScreen();
    expect(screen.queryByText(longStory)).toBeNull();

    fireEvent.press(screen.getByText('Read more'));

    expect(screen.getByText(longStory)).toBeOnTheScreen();
    expect(screen.getByText('Show less')).toBeOnTheScreen();
  });

  it('renders pedigree fields that are present and omits missing ones', () => {
    render(
      <StorySection
        story={null}
        pedigree={{ sire: 'Galileo', dam: 'Urban Sea' }}
      />,
    );

    expect(screen.getByText('Sire')).toBeOnTheScreen();
    expect(screen.getByText('Galileo')).toBeOnTheScreen();
    expect(screen.getByText('Dam')).toBeOnTheScreen();
    expect(screen.getByText('Urban Sea')).toBeOnTheScreen();
    expect(screen.queryByText('Damsire')).toBeNull();
  });
});
