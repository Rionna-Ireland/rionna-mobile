import type * as HapticsApi from './haptics';
import { Platform } from 'react-native';

const mockLoaded = jest.fn();
const mockHaptics = {
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  AndroidHaptics: {
    Clock_Tick: 'clock-tick',
    Virtual_Key: 'virtual-key',
    Confirm: 'confirm',
    Reject: 'reject',
    Gesture_End: 'gesture-end',
  },
};

jest.mock('expo-haptics', () => {
  mockLoaded();
  return mockHaptics;
});

type HapticsModule = typeof HapticsApi;

function load(os: 'ios' | 'android'): HapticsModule {
  Platform.OS = os;
  let mod: HapticsModule | undefined;
  jest.isolateModules(() => {
    mod = require('./haptics');
  });
  return mod!;
}

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('haptics vocabulary', () => {
  const originalOS = Platform.OS;
  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    Platform.OS = originalOS;
  });

  it('does not require expo-haptics at import time', () => {
    const h = load('ios');
    expect(mockLoaded).not.toHaveBeenCalled();
    h.selection();
    expect(mockLoaded).toHaveBeenCalledTimes(1);
    h.tap();
    expect(mockLoaded).toHaveBeenCalledTimes(1);
  });

  it('maps the vocabulary to the iOS generators', () => {
    const h = load('ios');
    h.selection();
    h.tap();
    h.success();
    h.warning();
    h.land();
    expect(mockHaptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(mockHaptics.impactAsync.mock.calls).toEqual([['light'], ['soft']]);
    expect(mockHaptics.notificationAsync.mock.calls).toEqual([['success'], ['warning']]);
    expect(mockHaptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it('land() plays once per session', () => {
    const h = load('ios');
    h.land();
    h.land();
    h.land();
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('uses the Android haptic constants on Android', () => {
    const h = load('android');
    h.selection();
    h.success();
    h.warning();
    h.land();
    expect(mockHaptics.performAndroidHapticsAsync.mock.calls).toEqual([
      ['clock-tick'],
      ['confirm'],
      ['reject'],
      ['gesture-end'],
    ]);
    expect(mockHaptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('tap() on Android follows ANDROID_TAP_HAPTICS', () => {
    const h = load('android');
    h.tap();
    expect(mockHaptics.performAndroidHapticsAsync).toHaveBeenCalledTimes(h.ANDROID_TAP_HAPTICS ? 1 : 0);
    if (h.ANDROID_TAP_HAPTICS)
      expect(mockHaptics.performAndroidHapticsAsync).toHaveBeenCalledWith('virtual-key');
  });

  it('falls back to the standard call when the Android constant is unsupported', async () => {
    mockHaptics.performAndroidHapticsAsync.mockImplementationOnce(() => Promise.reject(new Error('unsupported')));
    const h = load('android');
    h.success();
    await flush();
    expect(mockHaptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('swallows native rejections and sync throws', async () => {
    mockHaptics.selectionAsync.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    mockHaptics.impactAsync.mockImplementationOnce(() => {
      throw new Error('sync boom');
    });
    const h = load('ios');
    expect(() => h.selection()).not.toThrow();
    expect(() => h.tap()).not.toThrow();
    await flush();
  });
});
