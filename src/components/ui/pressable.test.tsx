import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { useReducedMotion, withSpring } from 'react-native-reanimated';

import { springs } from '@/lib/motion';
import { MotionPressable, RIPPLE_COLOR } from './pressable';

const mockTap = jest.fn();
const mockSelection = jest.fn();
jest.mock('@/lib/motion/haptics', () => ({
  tap: () => mockTap(),
  selection: () => mockSelection(),
  success: jest.fn(),
  warning: jest.fn(),
  land: jest.fn(),
}));

/** `android_ripple` values reaching any node (RN Pressable consumes it before the host view). */
function ripples() {
  return screen.UNSAFE_root
    .findAll((node: { props: Record<string, unknown> }) => node.props.android_ripple !== undefined)
    .map((node: { props: Record<string, unknown> }) => node.props.android_ripple);
}

describe('motionPressable', () => {
  const originalOS = Platform.OS;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    Platform.OS = originalOS;
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  function setup(props: Partial<React.ComponentProps<typeof MotionPressable>> = {}) {
    const onPress = jest.fn();
    render(
      <MotionPressable testID="press" accessibilityRole="button" accessibilityLabel="Follow" onPress={onPress} {...props}>
        <Text>Follow</Text>
      </MotionPressable>,
    );
    return { onPress, node: screen.getByTestId('press') };
  }

  it('renders children and passes accessibility props through', () => {
    setup();
    expect(screen.getByText('Follow')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeOnTheScreen();
  });

  it('fires onPress and the haptic', () => {
    const { onPress } = setup({ haptic: 'tap' });
    fireEvent.press(screen.getByTestId('press'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockTap).toHaveBeenCalledTimes(1);
    expect(mockSelection).not.toHaveBeenCalled();
  });

  it('fires no haptic by default', () => {
    setup();
    fireEvent.press(screen.getByTestId('press'));
    expect(mockTap).not.toHaveBeenCalled();
  });

  it('on iOS scales to pressScale on the snappy spring, deeper when small', () => {
    Platform.OS = 'ios';
    const { node } = setup({ size: 'small' });
    fireEvent(node, 'pressIn');
    expect(withSpring).toHaveBeenCalledWith(0.94, springs.snappy);
    expect(ripples()).toEqual([]);
  });

  it('under Reduce Motion does not scale', () => {
    Platform.OS = 'ios';
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { node } = setup();
    fireEvent(node, 'pressIn');
    expect(withSpring).toHaveBeenCalledWith(1, springs.snappy);
  });

  it('on Android uses a bounded ink ripple and no scale', () => {
    Platform.OS = 'android';
    const { node } = setup();
    fireEvent(node, 'pressIn');
    expect(withSpring).not.toHaveBeenCalled();
    expect(ripples()[0]).toEqual({ color: RIPPLE_COLOR, borderless: false });
    expect(RIPPLE_COLOR).toMatch(/1f$/);
  });

  describe('disabled opacity (A-003)', () => {
    const opacityOf = () => StyleSheet.flatten(screen.getByTestId('press').props.style)?.opacity;

    it('dims to 0.4 on iOS, where the animated style sits last', () => {
      Platform.OS = 'ios';
      setup({ disabled: true, style: { opacity: 1 } });
      expect(opacityOf()).toBe(0.4);
    });

    it('dims to 0.4 on Android', () => {
      Platform.OS = 'android';
      setup({ disabled: true });
      expect(opacityOf()).toBe(0.4);
    });

    it('stays at full opacity when enabled', () => {
      Platform.OS = 'ios';
      setup({ disabled: false });
      expect(opacityOf()).toBe(1);
    });

    it('does not dim when dimDisabled is false', () => {
      Platform.OS = 'ios';
      setup({ disabled: true, dimDisabled: false });
      expect(opacityOf()).toBeUndefined();
    });

    it('leaves opacity to the caller when it manages neither disabled nor pressedOpacity', () => {
      Platform.OS = 'ios';
      setup({ style: { opacity: 0.6 } });
      expect(opacityOf()).toBe(0.6);
    });
  });
});
