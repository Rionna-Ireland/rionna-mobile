import type { SvgProps } from 'react-native-svg';
import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export function Pulse({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M3 13h2l3-8 4 16 3-8h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}
