import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';

import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { HorseDetailBar } from './horse-detail-bar';

jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: jest.fn(() => 51) }));

afterEach(cleanup);

function progress(value: number) {
  return { get: () => value } as unknown as SharedValue<number>;
}

describe('horseDetailBar', () => {
  it('is white with no fill over the photo', () => {
    render(<HorseDetailBar horseName="Rionna Star" progress={progress(0)} onBack={jest.fn()} onShare={jest.fn()} />);
    expect(screen.getByTestId('horse-detail-bar-chrome')).toHaveStyle({ opacity: 0 });
    // The white layers are fully visible; the ink ones are stacked on top at 0.
    for (const id of ['horse-detail-bar-back', 'horse-detail-bar-share']) {
      expect(screen.getByTestId(`${id}-white`, { includeHiddenElements: true })).toHaveStyle({ opacity: 1 });
      expect(screen.getByTestId(`${id}-ink`, { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
    }
  });

  it('crosses to ink with the surface fill once the hero is under the bar', () => {
    render(<HorseDetailBar horseName="Rionna Star" progress={progress(1)} onBack={jest.fn()} onShare={jest.fn()} />);
    expect(screen.getByTestId('horse-detail-bar-chrome')).toHaveStyle({ opacity: 1 });
    for (const id of ['horse-detail-bar-back', 'horse-detail-bar-share']) {
      expect(screen.getByTestId(`${id}-white`, { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
      expect(screen.getByTestId(`${id}-ink`, { includeHiddenElements: true })).toHaveStyle({ opacity: 1 });
    }
  });

  it('keeps back and share working', async () => {
    const onBack = jest.fn();
    const onShare = jest.fn();
    const { user } = setup(<HorseDetailBar horseName="Rionna Star" progress={progress(0.5)} onBack={onBack} onShare={onShare} />);
    await user.press(screen.getByTestId('horse-hero-back'));
    await user.press(screen.getByTestId('horse-hero-share'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
