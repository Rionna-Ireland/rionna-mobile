import type { MotionPressableProps } from './pressable';
import * as React from 'react';
import { tv } from 'tailwind-variants';

import { minHitSlop } from './hit-slop';
import { MotionPressable } from './pressable';

/**
 * Icon-only button (S13-01 §7).
 * - `square`: navy 46×46 r8 (Figma "Button Icon"; the wallet button).
 * - `square-accent`: the same square in lilac (charity card wallet on plum).
 * - `circle`: ice-light 32×32 circle (the play button on photo cards).
 * - `circle-light`: 44×44 white-ish circle (Profile edit pencil).
 * The icon is passed as children; pick its colour to suit the fill.
 * Presses with the small `MotionPressable` scale; no haptic unless `haptic` is set.
 */
const iconButton = tv({
  base: 'items-center justify-center',
  variants: {
    variant: {
      'square': 'size-[46px] rounded-lg bg-primary',
      'square-accent': 'size-[46px] rounded-lg bg-primary-fixed',
      'circle': 'size-8 rounded-full bg-ice-light',
      'circle-light': 'size-11 rounded-full bg-surface',
    },
    // Disabled dimming lives in MotionPressable (A-003).
    disabled: { true: '' },
  },
  defaultVariants: { variant: 'square', disabled: false },
});

export type IconButtonVariant = 'square' | 'square-accent' | 'circle' | 'circle-light';

const SIZE: Record<IconButtonVariant, number> = {
  'square': 46,
  'square-accent': 46,
  'circle': 32,
  'circle-light': 44,
};

export type IconButtonProps = Omit<MotionPressableProps, 'children'> & {
  /** Required: icon-only buttons have no visible text. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  className?: string;
  children: React.ReactNode;
};

export function IconButton({
  variant = 'square',
  disabled,
  className,
  children,
  ...props
}: IconButtonProps) {
  const size = SIZE[variant];
  const pad = minHitSlop(size);
  return (
    <MotionPressable
      size="small"
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={pad ? { ...pad, left: pad.top, right: pad.top } : undefined}
      className={iconButton({ variant, disabled: Boolean(disabled), className })}
      {...props}
    >
      {children}
    </MotionPressable>
  );
}
