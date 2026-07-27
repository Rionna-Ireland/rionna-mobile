import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PhotoCarousel } from '@/features/stables/components/photo-carousel';

jest.mock('@/components/ui', () => ({
  Image: 'Image',
}));

const PHOTOS = [
  { url: 'https://cdn.test/one.jpg' },
  { url: 'https://cdn.test/two.jpg', caption: 'Morning gallop' },
  { url: 'https://cdn.test/three.jpg' },
];

describe('photoCarousel', () => {
  it('renders a single photo without pager dots', () => {
    render(<PhotoCarousel photos={[PHOTOS[0]]} />);

    expect(screen.queryByTestId('photo-carousel-dots')).toBeNull();
  });

  it('renders a swipable pager with one dot per photo', () => {
    render(<PhotoCarousel photos={PHOTOS} />);

    expect(screen.getByTestId('photo-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('photo-carousel-dots')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/photo-carousel-dot-/)).toHaveLength(3);
  });

  it('renders a placeholder when there are no photos', () => {
    render(<PhotoCarousel photos={[]} />);

    expect(screen.getByTestId('photo-carousel-placeholder')).toBeOnTheScreen();
  });
});
