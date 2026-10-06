import * as React from 'react';
import { Switch } from 'react-native';

import { colors } from '@/components/ui';
import { haptics } from '@/lib/motion';

type PreferenceSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  testID?: string;
};

/** Navy track when on, ice track when off (S13-08). Ticks a `selection()` haptic (S14-02 §9). */
export function PreferenceSwitch({ value, onValueChange, disabled, label, testID }: PreferenceSwitchProps) {
  return (
    <Switch
      testID={testID}
      accessibilityLabel={label}
      value={value}
      onValueChange={(next) => {
        haptics.selection();
        onValueChange(next);
      }}
      disabled={disabled}
      trackColor={{ true: colors.primary, false: colors.ice }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.ice}
    />
  );
}
