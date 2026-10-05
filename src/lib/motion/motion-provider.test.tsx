import { renderHook } from '@testing-library/react-native';
import * as React from 'react';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { classifyDevice, MotionProvider, useDeviceClass, useMotion } from './motion-provider';

const mockDevice = { totalMemory: 8 * 1024 ** 3, deviceYearClass: 2023 as number | null };
jest.mock('expo-device', () => mockDevice);

const GB = 1024 ** 3;

describe('classifyDevice', () => {
  it('is always high on iOS', () => {
    expect(classifyDevice('ios', { totalMemory: 2 * GB, deviceYearClass: 2015 })).toBe('high');
  });

  it('is low on Android under 4GB RAM', () => {
    expect(classifyDevice('android', { totalMemory: 3.5 * GB, deviceYearClass: 2022 })).toBe('low');
  });

  it('is low on Android with year class ≤ 2019 (Galaxy A50)', () => {
    expect(classifyDevice('android', { totalMemory: 6 * GB, deviceYearClass: 2019 })).toBe('low');
  });

  it('is high on a recent Android with ≥ 4GB', () => {
    expect(classifyDevice('android', { totalMemory: 8 * GB, deviceYearClass: 2022 })).toBe('high');
  });

  it('treats unknown values (or a missing module) as high', () => {
    expect(classifyDevice('android', { totalMemory: null, deviceYearClass: null })).toBe('high');
    expect(classifyDevice('android', null)).toBe('high');
  });
});

describe('useMotion', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('works without a provider', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current).toEqual({ reduceMotion: false, deviceClass: 'high' });
  });

  it('reports reduce motion from Reanimated', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const wrapper = ({ children }: { children: React.ReactNode }) => <MotionProvider>{children}</MotionProvider>;
    const { result } = renderHook(() => useMotion(), { wrapper });
    expect(result.current.reduceMotion).toBe(true);
  });

  it('classes an old Android device as low via expo-device', () => {
    Platform.OS = 'android';
    mockDevice.deviceYearClass = 2019;
    const { result } = renderHook(() => useDeviceClass());
    expect(result.current).toBe('low');
    mockDevice.deviceYearClass = 2023;
  });

  it('classes a recent Android device as high', () => {
    Platform.OS = 'android';
    const { result } = renderHook(() => useDeviceClass());
    expect(result.current).toBe('high');
  });
});
