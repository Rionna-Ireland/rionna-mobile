import type { SvgProps } from 'react-native-svg';
import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export function Horse({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M22 3s-1.5 1-3 1c-1 0-2-.5-2-.5L14 5l-1 2-3 1-2 3v4l-2 4h3l1-3 2 1v3h3v-4l2-2 1-3 2-1V7l3-1V3Z"
        fill={color}
      />
      <Path
        d="M7 15.5c-1 0-2 .5-2 .5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
