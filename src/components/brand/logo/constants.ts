import colors from '@/components/ui/colors';

/** Ink navy, the default logo colour. */
export const LOGO_INK: string = colors.ink;

/** Submark viewBox (Architecture/design/s13-final-design/logo/submark.svg). */
export const SUBMARK_VIEWBOX = { width: 440.19, height: 396 } as const;

/** The submark: ONE closed path (both ears + head). S14-04 stroke-draws it. */
export const SUBMARK_PATH
  = 'M7 0C16.735 38.471 37.715 62.264 71.01 75.337L71.01 0L78 0C91.526 53.453 147.5 80.099 186.771 85.7C259.012 96.004 440.191 149.52 440.191 386L157.5 386L157.5 255.876C123.76 343.515 87.24 390.928 0 396L0 0L7 0Z';

/**
 * Total length of `SUBMARK_PATH` in viewBox units, computed once offline
 * (flattened cubic sampling: 1807.6) and rounded up so the dash closes cleanly.
 * react-native-svg 15.12 has no `pathLength` prop, so the dash uses this.
 */
export const SUBMARK_PATH_LENGTH = 1808;
