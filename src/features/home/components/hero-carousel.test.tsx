/* eslint-disable react/no-unnecessary-use-prefix -- jest mock factories mirror real hook names */
import type { HeroSlide } from '@/features/home/lib/hero-slides';

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { HeroCarousel } from './hero-carousel';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

function slide(key: string): HeroSlide {
  return {
    key,
    kind: 'news',
    title: `Headline ${key}`,
    date: null,
    excerpt: null,
    cta: { label: 'Read', kind: 'route', href: '/news/x' },
  };
}

describe('heroCarousel', () => {
  it('keeps the 239pt floor, and grows every slide to the tallest at larger type (A-021)', () => {
    render(<HeroCarousel slides={[slide('a'), slide('b')]} width={358} />);
    expect(screen.getByTestId('home-hero-slide-1')).toHaveStyle({ minHeight: 239 });
    fireEvent(screen.getByTestId('home-hero-slide-0'), 'layout', { nativeEvent: { layout: { height: 262 } } });
    expect(screen.getByTestId('home-hero-slide-1')).toHaveStyle({ minHeight: 262 });
    expect(screen.getByTestId('home-hero-slide-0')).not.toHaveStyle({ height: 239 });
  });
});
