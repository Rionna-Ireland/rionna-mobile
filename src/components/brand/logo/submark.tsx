import type { SvgProps } from 'react-native-svg';
import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

import { LOGO_INK, SUBMARK_PATH, SUBMARK_VIEWBOX } from './constants';

const VIEWBOX_WIDTH = SUBMARK_VIEWBOX.width;
const VIEWBOX_HEIGHT = SUBMARK_VIEWBOX.height;
const ASPECT = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

export type SubmarkProps = Omit<SvgProps, 'color' | 'width' | 'height'> & {
  /** Fill colour (the SVG uses currentColor). Defaults to ink navy. */
  color?: string;
  /** Rendered width. Height follows the viewBox aspect. */
  width?: number;
  /** Rendered height. Width follows the viewBox aspect. Ignored if width is set. */
  height?: number;
};

/** Single closed <Path>: S14-04 stroke-draws this path, do not split or optimise it. */
export function Submark({ color = LOGO_INK, width, height, ...props }: SubmarkProps) {
  const w = width ?? (height !== undefined ? height * ASPECT : VIEWBOX_WIDTH / 4);
  const h = w / ASPECT;
  return (
    <Svg
      width={w}
      height={h}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      accessibilityLabel="Rionna"
      {...props}
    >
      <Path fillRule="nonzero" fill={color} d={SUBMARK_PATH} />
    </Svg>
  );
}
