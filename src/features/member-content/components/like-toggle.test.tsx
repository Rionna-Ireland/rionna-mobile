import * as React from 'react';
import { useReducedMotion, withSpring } from 'react-native-reanimated';

import { popScale, springs } from '@/lib/motion';
import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { LikeToggle } from './like-toggle';

const mockTap = jest.fn();
jest.mock('@/lib/motion/haptics', () => ({
  ...jest.requireActual('@/lib/motion/haptics'),
  tap: () => mockTap(),
}));

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  cleanup();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

describe('likeToggle', () => {
  it('taps and pops the heart (popScale → 1 on snappy) when liking', async () => {
    const onToggle = jest.fn();
    const { user } = setup(<LikeToggle likeCount={3} isLiked={false} onToggle={onToggle} />);
    await user.press(screen.getByLabelText('Like'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(mockTap).toHaveBeenCalledTimes(1);
    expect(withSpring).toHaveBeenCalledWith(1, springs.snappy);
    expect(popScale).toBe(0.85);
  });

  it('stays quiet when unliking', async () => {
    const onToggle = jest.fn();
    const { user } = setup(<LikeToggle likeCount={3} isLiked onToggle={onToggle} />);
    await user.press(screen.getByLabelText('Liked'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(mockTap).not.toHaveBeenCalled();
  });

  it('keeps the haptic but drops the pop under Reduce Motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { user } = setup(<LikeToggle likeCount={3} isLiked={false} onToggle={jest.fn()} />);
    await user.press(screen.getByLabelText('Like'));
    expect(mockTap).toHaveBeenCalledTimes(1);
    expect(withSpring).not.toHaveBeenCalled();
  });

  it('shows the filled heart only when liked, and a read-only count without onToggle', () => {
    const { rerender } = render(<LikeToggle likeCount={1} isLiked />);
    expect(screen.getByTestId('like-heart-fill')).toHaveStyle({ opacity: 1 });
    expect(screen.getByLabelText('1 like')).toBeOnTheScreen();
    rerender(<LikeToggle likeCount={2} isLiked={false} />);
    expect(screen.getByLabelText('2 likes')).toBeOnTheScreen();
  });
});
