/* eslint-disable react-refresh/only-export-components */
import type { ImageErrorEventData, ImageProps } from 'expo-image';
import type { PhotoFallbackProps } from './photo-fallback';
import { Image as NImage } from 'expo-image';
import * as React from 'react';
import { withUniwind } from 'uniwind';

import { durations, useMotion } from '@/lib/motion';

import colors from './colors';
import { PhotoFallback } from './photo-fallback';

export type ImgProps = ImageProps & {
  className?: string;
  /**
   * Design V2 fallback (S13-01 §6): when set, a missing `source` or a load
   * error renders a `PhotoFallback` (pattern in this colourway, optional
   * initials) in the image's box instead of the cream placeholder.
   */
  fallback?: Pick<PhotoFallbackProps, 'colourway' | 'initials' | 'kind' | 'tileSize'>;
};

const StyledImage = withUniwind(NImage);

const BASE83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function encode83(value: number, length: number): string {
  let out = '';
  for (let i = 1; i <= length; i++)
    out += BASE83[Math.floor(value / 83 ** (length - i)) % 83];
  return out;
}

/**
 * A 1×1-component blurhash of a single colour: a flat placeholder in a palette
 * token (`#rrggbb`), with no template smear (A-009). Size flag 0, no AC, DC = rgb.
 */
export function solidBlurhash(hex: string): string {
  return `00${encode83(Number.parseInt(hex.slice(1, 7), 16), 4)}`;
}

/** Default placeholder: the cream `secondaryContainer` (the `PhotoFallback` cream). */
export const IMAGE_PLACEHOLDER = { blurhash: solidBlurhash(colors.secondaryContainer) };

/**
 * Remote images fade in over `base` (A-009), `quick` under Reduce Motion (the
 * reduced fade). Hero-transition sources and destinations pass `transition={0}`:
 * the flight depends on instant draws.
 */
function useImageTransition(): number {
  const { reduceMotion } = useMotion();
  return reduceMotion ? durations.quick : durations.base;
}

function hasSource(source: ImageProps['source']): boolean {
  if (source == null)
    return false;
  if (typeof source === 'string')
    return source.length > 0;
  if (Array.isArray(source))
    return source.length > 0;
  if (typeof source === 'object' && 'uri' in source)
    return Boolean(source.uri);
  return true;
}

export function Image({
  style,
  className,
  placeholder = IMAGE_PLACEHOLDER,
  transition,
  fallback,
  onError,
  testID,
  ...props
}: ImgProps) {
  const [failed, setFailed] = React.useState(false);
  const defaultTransition = useImageTransition();
  const handleError = React.useCallback((e: ImageErrorEventData) => {
    setFailed(true);
    onError?.(e);
  }, [onError]);

  if (fallback && (failed || !hasSource(props.source))) {
    return (
      <PhotoFallback
        {...fallback}
        testID={testID}
        className={className}
        style={style as PhotoFallbackProps['style']}
      />
    );
  }

  return (
    <StyledImage
      className={className}
      placeholder={fallback ? undefined : placeholder}
      transition={transition ?? defaultTransition}
      style={style}
      testID={testID}
      onError={fallback ? handleError : onError}
      {...props}
    />
  );
}

export function preloadImages(sources: string[]) {
  NImage.prefetch(sources);
}
