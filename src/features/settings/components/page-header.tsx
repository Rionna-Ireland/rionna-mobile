import type { SharedValue } from 'react-native-reanimated';

import { Stack, useRouter } from 'expo-router';
import * as React from 'react';

import { ScreenHeader } from '@/components/ui';

type PageHeaderProps = {
  kicker: string;
  right?: React.ReactNode;
  testID?: string;
  /** Scroll offset of the content below: fades in the header hairline (S14-02 §5). */
  scrollY?: SharedValue<number>;
};

/**
 * Cream-page mono header with back (S13-08). Hides the native stack header
 * from inside the screen so `_layout.tsx` stays untouched.
 */
export function PageHeader({ kicker, right, testID = 'page-header', scrollY }: PageHeaderProps) {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader kicker={kicker} right={right} onBack={() => router.back()} testID={testID} scrollY={scrollY} />
    </>
  );
}
