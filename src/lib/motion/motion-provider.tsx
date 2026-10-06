/* eslint-disable react-refresh/only-export-components */
import type * as DeviceType from 'expo-device';
import * as React from 'react';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Motion context (S14-01 §4–5): Reduce Motion + device class, read once at the
 * root and shared. `useMotion()` also works without a provider (it computes
 * the same values itself), so isolated components and tests never crash.
 */

export type DeviceClass = 'high' | 'low';

export type MotionContextValue = {
  /** OS Reduce Motion is on: transforms → none, entrances → a `quick` fade. */
  reduceMotion: boolean;
  /** `low`: half the pattern tiles, crossfade instead of the hero transition. */
  deviceClass: DeviceClass;
};

const GB = 1024 ** 3;
/** Android devices under this much RAM are classed low-end (S14-00 decision 18). */
export const LOW_END_MEMORY_BYTES = 4 * GB;
/** Android devices of this year class or older are classed low-end (Galaxy A50: 2019). */
export const LOW_END_YEAR_CLASS = 2019;

type DeviceInfo = Pick<typeof DeviceType, 'totalMemory' | 'deviceYearClass'>;

function readDevice(): DeviceInfo | null {
  try {
    return require('expo-device') as DeviceInfo;
  }
  catch {
    return null;
  }
}

/**
 * Pure classifier. iOS is always `high`. Android is `low` when RAM < 4GB or
 * the year class is ≤ 2019; unknown values don't count against the device.
 */
export function classifyDevice(os: string, device: DeviceInfo | null): DeviceClass {
  if (os !== 'android' || !device)
    return 'high';
  const { totalMemory, deviceYearClass } = device;
  if (typeof totalMemory === 'number' && totalMemory < LOW_END_MEMORY_BYTES)
    return 'low';
  if (typeof deviceYearClass === 'number' && deviceYearClass <= LOW_END_YEAR_CLASS)
    return 'low';
  return 'high';
}

/** `'high' | 'low'` for this device. Reads `expo-device` lazily, once per mount. */
export function useDeviceClass(): DeviceClass {
  return React.useMemo(
    () => classifyDevice(Platform.OS, Platform.OS === 'android' ? readDevice() : null),
    [],
  );
}

/** The OS Reduce Motion preference (Reanimated's `useReducedMotion`). */
export function useReducedMotionPreference(): boolean {
  return useReducedMotion();
}

const MotionContext = React.createContext<MotionContextValue | null>(null);

function useComputedMotion(): MotionContextValue {
  const reduceMotion = useReducedMotionPreference();
  const deviceClass = useDeviceClass();
  return React.useMemo(() => ({ reduceMotion, deviceClass }), [reduceMotion, deviceClass]);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const value = useComputedMotion();
  return <MotionContext value={value}>{children}</MotionContext>;
}

/** `{ reduceMotion, deviceClass }`: from `MotionProvider`, or computed locally without one. */
export function useMotion(): MotionContextValue {
  const fromProvider = React.use(MotionContext);
  // Hooks run unconditionally; the local value is only used outside a provider.
  const local = useComputedMotion();
  return fromProvider ?? local;
}
