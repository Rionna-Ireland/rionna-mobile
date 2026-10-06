import type { View } from 'react-native';
import type { VariantProps } from 'tailwind-variants';
import type { MotionPressableProps } from './pressable';
import type { HapticIntent } from '@/lib/motion';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import { tv } from 'tailwind-variants';

import colors from './colors';
import { minHitSlop } from './hit-slop';
import { MorphLabel } from './morph-label';
import { MotionPressable } from './pressable';

/**
 * Design V2 button (S13-01 §7). Variants come from the Figma `Button L/M/S`
 * components; sizes L 45h r8 `title`, M 30h r6 SemiBold 12, S 27h r4
 * SemiBold 12. Press feedback is the S14 `MotionPressable` (scale on iOS,
 * ripple on Android); a changed label crossfades (`MorphLabel`).
 *
 * Legacy variant names stay accepted so existing callers keep working:
 * `default` → `primary`, `outline` → `secondary`. `ghost`/`link` are
 * text-only buttons on light surfaces.
 */
const button = tv({
  slots: {
    container: 'flex-row items-center justify-center',
    label: 'text-center',
  },
  variants: {
    variant: {
      'primary': { container: 'bg-primary', label: 'text-on-primary' },
      'default': { container: 'bg-primary', label: 'text-on-primary' },
      'secondary': { container: 'border border-primary bg-white', label: 'text-ink' },
      'outline': { container: 'border border-primary bg-white', label: 'text-ink' },
      'accent': { container: 'bg-primary-fixed', label: 'text-plum' },
      'on-dark': { container: 'bg-white', label: 'text-ink' },
      'ghost-on-dark': { container: 'border border-white bg-transparent', label: 'text-white' },
      'destructive': { container: 'bg-plum', label: 'text-on-primary' },
      'ghost': { container: 'bg-transparent', label: 'text-ink underline' },
      'link': { container: 'bg-transparent', label: 'text-ink' },
    },
    size: {
      lg: { container: 'h-[45px] rounded-lg px-[26px]' },
      default: { container: 'h-[45px] rounded-lg px-[26px]' },
      md: { container: 'h-[30px] rounded-md px-4', label: 'font-sans-semibold' },
      sm: { container: 'h-[27px] rounded-sm px-3', label: 'font-sans-semibold' },
    },
    // Disabled dimming lives in MotionPressable (A-003): one source, both platforms.
    disabled: {
      true: { container: '' },
    },
    fullWidth: {
      true: { container: '' },
      false: { container: 'self-center' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    disabled: false,
    fullWidth: true,
    size: 'lg',
  },
});

type ButtonVariants = VariantProps<typeof button>;
export type ButtonVariant = NonNullable<ButtonVariants['variant']>;
export type ButtonSize = NonNullable<ButtonVariants['size']>;

const SIZE_HEIGHT: Record<ButtonSize, number> = { lg: 45, default: 45, md: 30, sm: 27 };

const INDICATOR_COLOR: Record<ButtonVariant, string> = {
  'primary': colors.onPrimary,
  'default': colors.onPrimary,
  'secondary': colors.ink,
  'outline': colors.ink,
  'accent': colors.plum,
  'on-dark': colors.ink,
  'ghost-on-dark': colors.white,
  'destructive': colors.onPrimary,
  'ghost': colors.ink,
  'link': colors.ink,
};

/** S14-02 §1: only primary actions tap; secondary buttons stay silent. */
function defaultButtonHaptic(variant: ButtonVariant): HapticIntent | undefined {
  return variant === 'primary' || variant === 'default' ? 'tap' : undefined;
}

type Props = {
  label?: string;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  /**
   * Haptic on press. Defaults to `tap` for `primary`, none otherwise. Pass an
   * intent to opt in (e.g. `success` for RSVP) or `false` to silence.
   */
  haptic?: HapticIntent | false;
} & ButtonVariants & Omit<MotionPressableProps, 'disabled' | 'haptic' | 'size'>;

export function Button({
  ref,
  label: text,
  loading = false,
  variant = 'primary',
  disabled = false,
  size = 'lg',
  fullWidth = true,
  className = '',
  testID,
  textClassName = '',
  haptic,
  ...props
}: Props & { ref?: React.RefObject<View | null> }) {
  const styles = React.useMemo(
    () => button({ variant, disabled, size, fullWidth }),
    [variant, disabled, size, fullWidth],
  );
  const v = variant ?? 'primary';
  const s = size ?? 'lg';
  const isLarge = s === 'lg' || s === 'default';
  const isDisabled = Boolean(disabled) || loading;

  return (
    <MotionPressable
      disabled={isDisabled}
      haptic={haptic === false ? undefined : (haptic ?? defaultButtonHaptic(v))}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={minHitSlop(SIZE_HEIGHT[s])}
      className={styles.container({ className })}
      {...props}
      ref={ref}
      testID={testID}
    >
      {props.children
        ? (
            props.children as React.ReactNode
          )
        : loading
          ? (
              <ActivityIndicator
                size="small"
                color={INDICATOR_COLOR[v]}
                testID={testID ? `${testID}-activity-indicator` : undefined}
              />
            )
          : (
              <MorphLabel
                variant={isLarge ? 'title' : 'body-sm'}
                testID={testID ? `${testID}-label` : undefined}
                className={styles.label({ className: textClassName })}
                text={text}
              />
            )}
    </MotionPressable>
  );
}
