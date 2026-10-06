import type { Animated } from 'react-native';
import * as React from 'react';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { render as baseRender, cleanup, screen } from '@/lib/test-utils';

import { Toast, TOAST_RISE, toastTransition } from './toast';

afterEach(cleanup);

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
function render(ui: React.ReactElement) {
  return baseRender(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

describe('toast (A-037)', () => {
  it('renders the title and description as one alert', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    render(<Toast message={{ message: 'Code copied', description: 'Paste it at checkout', type: 'success' }} />);
    const toast = screen.getByTestId('toast-success');
    expect(toast.props.accessibilityRole).toBe('alert');
    expect(toast.props.accessibilityLabel).toBe('Code copied. Paste it at checkout');
    expect(screen.getByText('Code copied')).toBeOnTheScreen();
    expect(screen.getByText('Paste it at checkout')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Code copied. Paste it at checkout');
  });

  it('uses the navy surface for success', () => {
    render(<Toast message={{ message: 'Saved', type: 'success' }} />);
    expect(screen.getByTestId('toast-success').props.className).toContain('bg-primary');
  });

  it('uses plum (not the default red) for danger', () => {
    render(<Toast message={{ message: 'Failed', type: 'danger' }} />);
    expect(screen.getByTestId('toast-danger').props.className).toContain('bg-plum');
    expect(screen.getByTestId('toast-dot').props.className).toContain('bg-primary-fixed');
  });

  it('sits below the status bar', () => {
    render(<Toast message={{ message: 'Hi', type: 'info' }} />);
    expect(screen.getByTestId('toast-info').parent?.parent).toHaveStyle({ paddingTop: 55 });
  });

  it('falls back to the default look for unknown types', () => {
    render(<Toast message={{ message: 'Hi', type: 'mystery' }} />);
    expect(screen.getByTestId('toast-default')).toBeOnTheScreen();
  });

  it('rises from above at the top and fades only under Reduce Motion', () => {
    const value = { interpolate: jest.fn(config => config) } as unknown as Animated.Value;
    const full = toastTransition(false)(value, 'top') as { transform: { translateY: unknown }[] };
    expect(full.transform[0].translateY).toEqual({ inputRange: [0, 1], outputRange: [-TOAST_RISE, 0] });
    const reduced = toastTransition(true)(value, 'top');
    expect(reduced).toEqual({ opacity: value });
  });
});
