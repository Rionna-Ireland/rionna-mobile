/**
 * Pure maths for the Horse card → Horse detail hero transition (S14-05).
 * Worklets, so the overlay and the scroll-linked hero run them on the UI
 * thread; plain functions, so they're unit-tested without a device.
 */

export type Rect = { x: number; y: number; width: number; height: number };

export const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
  'worklet';
  return from + (to - from) * t;
}

/** Linear blend of two rects. `t` may overshoot 0–1 (the `hero` spring has a breath of it). */
export function lerpRect(from: Rect, to: Rect, t: number): Rect {
  'worklet';
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
  };
}

export function hasArea(rect: Rect | null | undefined): rect is Rect {
  'worklet';
  return !!rect && rect.width > 0 && rect.height > 0;
}

/**
 * The box an image of `aspect` (width / height) fills when it `cover`s
 * `frame`, centred on it: what `contentFit="cover"` draws. The overlay keeps
 * the image at this fixed aspect and only moves/scales it, so the crop
 * morphs smoothly while the clip around it changes shape. Blending two cover
 * boxes linearly still covers the blended clip (each edge stays outside), so
 * no gap ever opens mid-flight.
 */
export function coverRect(aspect: number, frame: Rect): Rect {
  'worklet';
  if (!(aspect > 0) || !hasArea(frame))
    return frame;
  const frameAspect = frame.width / frame.height;
  const width = frameAspect > aspect ? frame.width : frame.height * aspect;
  const height = frameAspect > aspect ? frame.width / aspect : frame.height;
  return {
    x: frame.x + (frame.width - width) / 2,
    y: frame.y + (frame.height - height) / 2,
    width,
    height,
  };
}

export type ImageTransform = { translateX: number; translateY: number; scale: number };

/**
 * The inner image is laid out once at `base` size (top-left of the clip) and
 * then only transformed. RN scales around the view's centre, so translate the
 * centre onto `image`'s centre (clip-relative) and scale to its width.
 */
export function innerImageTransform(image: Rect, clip: Rect, base: { width: number; height: number }): ImageTransform {
  'worklet';
  if (base.width <= 0)
    return { translateX: 0, translateY: 0, scale: 1 };
  return {
    translateX: image.x - clip.x + image.width / 2 - base.width / 2,
    translateY: image.y - clip.y + image.height / 2 - base.height / 2,
    scale: image.width / base.width,
  };
}

/** Fraction (0–1) of `rect`'s area inside `viewport`. */
export function visibleFraction(rect: Rect, viewport: Rect): number {
  'worklet';
  if (!hasArea(rect))
    return 0;
  const w = Math.min(rect.x + rect.width, viewport.x + viewport.width) - Math.max(rect.x, viewport.x);
  const h = Math.min(rect.y + rect.height, viewport.y + viewport.height) - Math.max(rect.y, viewport.y);
  if (w <= 0 || h <= 0)
    return 0;
  return (w * h) / (rect.width * rect.height);
}

/** Sub-point rounding in `measureInWindow` must not turn a fully visible source into a crossfade. */
const VISIBLE_EPSILON = 0.01;

/**
 * A source is a valid end of the flight only when it's fully on screen
 * (inside the content viewport: below the header, above the tab bar). A
 * partly hidden photo would fly out from under chrome, so it crossfades.
 */
export function isRectOnscreen(rect: Rect | null, viewport: Rect): boolean {
  'worklet';
  return !!rect && visibleFraction(rect, viewport) >= 1 - VISIBLE_EPSILON;
}

/**
 * Overlay rects for the hero at scroll offset `scrollY` (reverse flight start).
 * With parallax the photo sits `(1 - parallax) × scrollY` lower inside its clip (the
 * same drift `heroScrollStyle` applies), so
 * the clip starts at the photo's top (the strip above it is off screen anyway)
 * and the image box covers the photo box, exactly as the hero draws it.
 */
export function heroFrameAtScroll(heroRect: Rect, scrollY: number, photo: { parallax: number; aspect: number }): { clip: Rect; image: Rect } {
  'worklet';
  const { parallax, aspect } = photo;
  const s = clamp(scrollY, 0, heroRect.height);
  const photoTop = heroRect.y - s + s * (1 - parallax);
  const clipBottom = heroRect.y - s + heroRect.height;
  const photoBox = { x: heroRect.x, y: photoTop, width: heroRect.width, height: heroRect.height };
  const clip = { x: heroRect.x, y: photoTop, width: heroRect.width, height: Math.max(0, clipBottom - photoTop) };
  return { clip, image: coverRect(aspect, photoBox) };
}

export type HeroScrollStyle = {
  /** Clip wrapper: pinned to the top of the window and scaled from its top edge while overscrolled. */
  wrapperTranslateY: number;
  wrapperScale: number;
  /** Photo inside the clip: parallax drift while scrolling up. */
  photoTranslateY: number;
};

const REST: HeroScrollStyle = { wrapperTranslateY: 0, wrapperScale: 1, photoTranslateY: 0 };

/**
 * Hero scroll response (S14-05 §5):
 * - scrolling up (y > 0): the photo drifts down at `(1 - parallax)` of the
 *   scroll inside its clip, so on screen it travels at `parallax ×` speed;
 * - overscroll (y < 0): the clip moves up by the pull so its top stays at the
 *   window top, and scales from that top edge by `1 + -y / heroHeight`, so its
 *   bottom stays glued to the content below.
 * `enabled = false` (Reduce Motion) holds it at rest.
 */
export type HeroScrollOptions = { heroHeight: number; parallax: number; enabled: boolean };

export function heroScrollStyle(scrollY: number, { heroHeight, parallax, enabled }: HeroScrollOptions): HeroScrollStyle {
  'worklet';
  if (!enabled || heroHeight <= 0)
    return REST;
  if (scrollY < 0) {
    return { wrapperTranslateY: scrollY, wrapperScale: 1 + -scrollY / heroHeight, photoTranslateY: 0 };
  }
  // Past the hero there's nothing left to drift.
  const y = Math.min(scrollY, heroHeight);
  return { wrapperTranslateY: 0, wrapperScale: 1, photoTranslateY: y * (1 - parallax) };
}

export type FrameCheck = 'watching' | 'ok' | 'abort';

/** `measureInWindow`'s `(x, y, width, height)` as a rect; null when it isn't laid out. */
export function measuredRect(values: readonly number[]): Rect | null {
  const [x = 0, y = 0, width = 0, height = 0] = values;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

/**
 * Frame-drop abort (S14-05 §6): with the first `frames` intervals of the
 * flight in hand, abort to a crossfade only if EVERY one of them was a dropped
 * frame (longer than `droppedMs`). A single hitch (e.g. the detail screen's
 * native mount landing on one frame) doesn't abort; a device that can't keep
 * up does.
 */
export function frameCheck(intervals: readonly number[], frames: number, droppedMs: number): FrameCheck {
  'worklet';
  if (intervals.length < frames)
    return 'watching';
  for (let i = 0; i < frames; i++) {
    if (intervals[i] <= droppedMs)
      return 'ok';
  }
  return 'abort';
}

/** Card-name layer: fades out over the first half of the flight (toward the detail). */
export function startNameOpacity(detailProgress: number): number {
  'worklet';
  return 1 - clamp(detailProgress / 0.5, 0, 1);
}

/** Hero-name layer: fades in over the last 60% of the flight (toward the detail). */
export function endNameOpacity(detailProgress: number): number {
  'worklet';
  return clamp((detailProgress - 0.4) / 0.6, 0, 1);
}
