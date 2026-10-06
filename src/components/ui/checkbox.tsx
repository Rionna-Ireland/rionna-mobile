import type { MotionPressableProps } from './pressable';
import { MotiView } from 'moti';
import * as React from 'react';
import { useCallback } from 'react';
import { I18nManager, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { durations, springs, useMotion } from '@/lib/motion';

import { MotionPressable } from './pressable';
import { Text } from './text';

/** Colour/opacity flips on the checkbox and radio: `instant`. */
const FLIP = { type: 'timing', duration: durations.instant } as const;

const SIZE = 20;
const WIDTH = 50;
const HEIGHT = 28;
const THUMB_HEIGHT = 22;
const THUMB_WIDTH = 22;
const THUMB_OFFSET = 4;

export type RootProps = {
  onChange: (checked: boolean) => void;
  checked?: boolean;
  className?: string;
  accessibilityLabel: string;
} & Omit<MotionPressableProps, 'onPress'>;

export type IconProps = {
  checked: boolean;
};

export function Root({
  checked = false,
  children,
  onChange,
  disabled,
  className = '',
  ...props
}: RootProps) {
  const handleChange = useCallback(() => {
    onChange(!checked);
  }, [onChange, checked]);

  // Toggles tick with a `selection()` haptic (S14-02 §9).
  return (
    <MotionPressable
      size="small"
      haptic="selection"
      onPress={handleChange}
      className={`flex-row items-center ${className}`}
      accessibilityState={{ checked }}
      disabled={disabled}
      {...props}
    >
      {children}
    </MotionPressable>
  );
}

type LabelProps = {
  text: string;
  className?: string;
  testID?: string;
};

function Label({ text, testID, className = '' }: LabelProps) {
  return (
    <Text testID={testID} className={`${className} pl-2`}>
      {text}
    </Text>
  );
}

export function CheckboxIcon({ checked = false }: IconProps) {
  const color = checked ? colors.primary : colors.inkMuted;
  return (
    <MotiView
      style={{
        height: SIZE,
        width: SIZE,
        borderColor: color,
      }}
      className="items-center justify-center rounded-[5px] border-2"
      from={{ backgroundColor: 'transparent', borderColor: colors.outline }}
      animate={{
        backgroundColor: checked ? color : 'transparent',
        borderColor: color,
      }}
      transition={{ backgroundColor: FLIP, borderColor: FLIP }}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={{ opacity: FLIP }}
      >
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Path
            d="m16.726 7-.64.633c-2.207 2.212-3.878 4.047-5.955 6.158l-2.28-1.928-.69-.584L6 12.66l.683.577 2.928 2.477.633.535.591-.584c2.421-2.426 4.148-4.367 6.532-6.756l.633-.64L16.726 7Z"
            fill={colors.white}
          />
        </Svg>
      </MotiView>
    </MotiView>
  );
}

function CheckboxRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root checked={checked} accessibilityRole="checkbox" {...props}>
      {children}
    </Root>
  );
}

function CheckboxBase({
  checked = false,
  testID,
  label,

  ...props
}: RootProps & { label?: string }) {
  return (
    <CheckboxRoot checked={checked} testID={testID} {...props}>
      <CheckboxIcon checked={checked} />
      {label
        ? (
            <Label
              text={label}
              testID={testID ? `${testID}-label` : undefined}
              className="pr-2"
            />
          )
        : null}
    </CheckboxRoot>
  );
}

export const Checkbox = Object.assign(CheckboxBase, {
  Icon: CheckboxIcon,
  Root: CheckboxRoot,
  Label,
});

export function RadioIcon({ checked = false }: IconProps) {
  const color = checked ? colors.primary : colors.inkMuted;
  return (
    <MotiView
      style={{
        height: SIZE,
        width: SIZE,
        borderColor: color,
      }}
      className="items-center justify-center rounded-[20px] border-2 bg-transparent"
      from={{ borderColor: colors.outline }}
      animate={{
        borderColor: color,
      }}
      transition={{ borderColor: FLIP }}
    >
      <MotiView
        className={`size-[10px] rounded-[10px] ${checked && 'bg-primary'}`}
        from={{ opacity: 0 }}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={{ opacity: FLIP }}
      />
    </MotiView>
  );
}

function RadioRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root checked={checked} accessibilityRole="radio" {...props}>
      {children}
    </Root>
  );
}

function RadioBase({
  checked = false,
  testID,
  label,
  ...props
}: RootProps & { label?: string }) {
  return (
    <RadioRoot checked={checked} testID={testID} {...props}>
      <RadioIcon checked={checked} />
      {label
        ? (
            <Label text={label} testID={testID ? `${testID}-label` : undefined} />
          )
        : null}
    </RadioRoot>
  );
}

export const Radio = Object.assign(RadioBase, {
  Icon: RadioIcon,
  Root: RadioRoot,
  Label,
});

/** Thumb slides on the `snappy` spring; Reduce Motion jumps it. */
export function SwitchIcon({ checked = false }: IconProps) {
  const { reduceMotion } = useMotion();
  const translateX = checked
    ? THUMB_OFFSET
    : WIDTH - THUMB_WIDTH - THUMB_OFFSET;

  const backgroundColor = checked ? colors.primary : colors.inkMuted;

  return (
    <View className="w-[50px] justify-center">
      <View className="overflow-hidden rounded-full">
        <View
          style={{
            width: WIDTH,
            height: HEIGHT,
            backgroundColor,
          }}
        />
      </View>
      <MotiView
        style={{
          height: THUMB_HEIGHT,
          width: THUMB_WIDTH,
          position: 'absolute',
          backgroundColor: 'white',
          borderRadius: 13,
          right: 0,
        }}
        animate={{
          translateX: I18nManager.isRTL ? translateX : -translateX,
        }}
        transition={{
          translateX: reduceMotion ? { type: 'no-animation' } : { type: 'spring', ...springs.snappy },
        }}
      />
    </View>
  );
}
function SwitchRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root checked={checked} accessibilityRole="switch" {...props}>
      {children}
    </Root>
  );
}

function SwitchBase({
  checked = false,
  testID,
  label,
  ...props
}: RootProps & { label?: string }) {
  return (
    <SwitchRoot checked={checked} testID={testID} {...props}>
      <SwitchIcon checked={checked} />
      {label
        ? (
            <Label text={label} testID={testID ? `${testID}-label` : undefined} />
          )
        : null}
    </SwitchRoot>
  );
}

export const Switch = Object.assign(SwitchBase, {
  Icon: SwitchIcon,
  Root: SwitchRoot,
  Label,
});
