/* eslint-disable react-refresh/only-export-components */
import type { Animated } from 'react-native';
import type { MessageComponentProps, Position } from 'react-native-flash-message';
import * as React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { twMerge } from 'tailwind-merge';

import { durations, useMotion } from '@/lib/motion';

import { Text } from './text';

/**
 * Branded toast (S14-08 A-037). Replaces react-native-flash-message's default
 * saturated banner with a card-shaped surface: navy for success/info, plum for
 * warning/danger, white text, r8 like cards, a small colour dot as the type cue
 * (sage = success, ice = info, lilac = warning/danger). Enters on a `quick`
 * fade + 8pt rise; Reduce Motion keeps the fade only.
 *
 * Call sites don't change: `showMessage` / `showErrorMessage` keep working,
 * `<Toaster />` passes this as the `MessageComponent`.
 */
export type ToastType = 'success' | 'info' | 'warning' | 'danger' | 'default' | 'none';

const SURFACE: Record<ToastType, string> = {
  success: 'bg-primary',
  info: 'bg-primary',
  default: 'bg-primary',
  none: 'bg-primary',
  warning: 'bg-plum',
  danger: 'bg-plum',
};

const DOT: Record<ToastType, string> = {
  success: 'bg-sage',
  info: 'bg-ice',
  default: 'bg-ice',
  none: 'bg-ice',
  warning: 'bg-primary-fixed',
  danger: 'bg-primary-fixed',
};

/** Rise (pt) as the toast enters; matches the Arrival welcome rise. */
export const TOAST_RISE = 8;

function toastType(type: string | undefined): ToastType {
  return type && type in SURFACE ? (type as ToastType) : 'default';
}

export function Toast({ message, testID }: Pick<MessageComponentProps, 'message'> & { testID?: string }) {
  const insets = useSafeAreaInsets();
  const type = toastType(message.type);
  const label = message.description ? `${message.message}. ${message.description}` : message.message;

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  return (
    <View pointerEvents="box-none" className="px-4" style={{ paddingTop: insets.top + 8 }}>
      <View
        testID={testID ?? `toast-${type}`}
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={label}
        className={twMerge('flex-row items-start gap-3 rounded-lg px-4 py-3', SURFACE[type])}
      >
        <View testID="toast-dot" className={twMerge('mt-1.5 size-2 rounded-full', DOT[type])} />
        <View className="flex-1 gap-0.5">
          <Text variant="body" className="font-sans-semibold text-on-primary">{message.message}</Text>
          {message.description
            ? <Text variant="body-sm" className="text-on-primary opacity-80">{message.description}</Text>
            : null}
        </View>
      </View>
    </View>
  );
}

/** Fade + `TOAST_RISE` rise; fade only under Reduce Motion. */
export function toastTransition(reduceMotion: boolean) {
  return (value: Animated.Value, position: Position) => {
    const from = position === 'bottom' ? TOAST_RISE : -TOAST_RISE;
    return reduceMotion
      ? { opacity: value }
      : { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] };
  };
}

function ToastMessage(props: MessageComponentProps) {
  return <Toast message={props.message} />;
}

/** Mount once at the root, in place of `<FlashMessage />`. */
export function Toaster() {
  const { reduceMotion } = useMotion();
  const transitionConfig = React.useMemo(() => toastTransition(reduceMotion), [reduceMotion]);
  return (
    <FlashMessage
      position="top"
      MessageComponent={ToastMessage}
      animationDuration={durations.quick}
      transitionConfig={transitionConfig}
    />
  );
}
