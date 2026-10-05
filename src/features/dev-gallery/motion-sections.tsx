import type { HapticIntent } from '@/lib/motion';
import * as React from 'react';
import { View } from 'react-native';

import { MotionPressable, Text } from '@/components/ui';
import { LoginMedia } from '@/features/arrival/login-media';

import { Caption, Section } from './section';

/** Public sample clip for the expo-video smoke test (S14-01). Dev-only. */
const SAMPLE_CLIP = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

const POSTER = require('../../../assets/login-poster.jpg');

const HAPTICS: HapticIntent[] = ['selection', 'tap', 'success', 'warning'];

export function MotionPressableSection() {
  return (
    <Section title="MotionPressable">
      <Caption>iOS: scale (snappy) · Android: ink ripple · tap each for its haptic</Caption>
      <MotionPressable
        haptic="tap"
        pressedOpacity={0.9}
        accessibilityRole="button"
        className="h-14 items-center justify-center overflow-hidden rounded-lg bg-primary"
      >
        <Text className="font-sans-semibold text-on-primary">Default · haptic tap · opacity 0.9</Text>
      </MotionPressable>
      <View className="flex-row flex-wrap gap-2">
        {HAPTICS.map(intent => (
          <MotionPressable
            key={intent}
            size="small"
            haptic={intent}
            accessibilityRole="button"
            className="h-8 items-center justify-center overflow-hidden rounded-md bg-white px-3"
          >
            <Text variant="body-sm" className="font-sans-semibold">{`small · ${intent}`}</Text>
          </MotionPressable>
        ))}
      </View>
    </Section>
  );
}

/** expo-video smoke test: proves the player is in the binary. Never in production. */
export function LoginVideoSection() {
  if (!__DEV__)
    return null;
  return (
    <Section title="LoginMedia video">
      <Caption>expo-video smoke test (muted, looping sample clip)</Caption>
      <LoginMedia poster={POSTER} videoSource={SAMPLE_CLIP} />
      <Caption>production placeholder (no videoSource)</Caption>
      <LoginMedia poster={POSTER} />
    </Section>
  );
}
