import { render, screen } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import * as React from 'react';

import { ArrivalSplash } from './arrival-splash';
import { LoginMedia } from './login-media';
import { firstName } from './welcome-name';

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

describe('firstName', () => {
  it('returns the first token', () => {
    expect(firstName('Sarah Kavanagh')).toBe('Sarah');
    expect(firstName('  Sarah  ')).toBe('Sarah');
  });

  it('returns null when there is no name', () => {
    expect(firstName(undefined)).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(firstName('   ')).toBeNull();
  });
});

describe('arrivalSplash', () => {
  it('renders both variants', () => {
    const { rerender } = render(<ArrivalSplash />);
    expect(screen.getByTestId('arrival-splash-light')).toBeTruthy();
    rerender(<ArrivalSplash variant="navy" />);
    expect(screen.getByTestId('arrival-splash-navy')).toBeTruthy();
  });
});

describe('loginMedia', () => {
  beforeEach(() => jest.mocked(useVideoPlayer).mockClear());

  it('renders a decorative, non-interactive play button', () => {
    render(<LoginMedia poster={{ uri: 'x' }} />);
    expect(screen.getByTestId('login-media-play', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
    expect(screen.getByTestId('login-media', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('never mounts the video player without a videoSource', () => {
    render(<LoginMedia poster={{ uri: 'x' }} />);
    expect(screen.queryByTestId('login-media-video', { includeHiddenElements: true })).toBeNull();
    expect(useVideoPlayer).not.toHaveBeenCalled();
  });

  it('plays a muted, looping video (no play button) when given a videoSource', () => {
    render(<LoginMedia poster={{ uri: 'x' }} videoSource="https://example.com/clip.mp4" />);
    const video = screen.getByTestId('login-media-video', { includeHiddenElements: true });
    expect(video.props.contentFit).toBe('cover');
    expect(video.props.nativeControls).toBe(false);
    expect(screen.queryByTestId('login-media-play', { includeHiddenElements: true })).toBeNull();
    const player = jest.mocked(useVideoPlayer).mock.results[0].value;
    expect(player).toMatchObject({ muted: true, loop: true });
    expect(player.play).toHaveBeenCalled();
  });
});
