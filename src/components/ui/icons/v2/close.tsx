import type { IconV2Props } from './types';
import * as React from 'react';

import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';

/** Close / remove (×), stroked to match the other v2 icons. */
export function CloseV2({
  color = colors.ink,
  size = 24,
  strokeWidth = 1.7,
  ...props
}: IconV2Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M6 6L18 18M18 6L6 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
