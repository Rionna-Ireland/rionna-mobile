import type { LayoutChangeEvent, ScrollView } from 'react-native';
import type { HorseSectionKey } from '@/features/stables/lib/horse-sections';

import * as React from 'react';

import { getActiveSection, getSectionScrollTarget } from '@/features/stables/lib/horse-sections';

/** A section is "active" once its top crosses this fraction of the viewport. */
const ACTIVE_LINE_FRACTION = 0.3;
/** How long scroll tracking pauses after a chip tap, so the animated scroll doesn't flick the chip through the sections in between. */
const TAP_LOCK_MS = 600;
const END_TOLERANCE = 4;

/** What the scroll handler forwards from each scroll event (the UI-thread handler sends plain numbers). */
export type ScrollMetrics = { y: number; viewportHeight: number; contentHeight: number };

/**
 * Section-chip ↔ scroll sync for Horse detail (S13-04 §2). Sections must be
 * direct children of the ScrollView's content so their `onLayout` y is a
 * content offset. Fed from the screen's scroll handler with plain metrics.
 */
export function useSectionScrollSync(visible: readonly HorseSectionKey[]) {
  const scrollRef = React.useRef<ScrollView>(null);
  const offsetsRef = React.useRef<Partial<Record<HorseSectionKey, number>>>({});
  const lockRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = React.useState<HorseSectionKey | undefined>(undefined);

  React.useEffect(() => () => {
    if (lockRef.current)
      clearTimeout(lockRef.current);
  }, []);

  const onSectionLayout = React.useCallback(
    (key: HorseSectionKey) => (event: LayoutChangeEvent) => {
      offsetsRef.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const onScroll = React.useCallback(
    ({ y, viewportHeight, contentHeight }: ScrollMetrics) => {
      if (lockRef.current)
        return;
      const offsets = visible.flatMap((key) => {
        const y = offsetsRef.current[key];
        return y == null ? [] : [{ key, y }];
      });
      const atEnd = contentHeight > viewportHeight
        && y + viewportHeight >= contentHeight - END_TOLERANCE;
      const next = getActiveSection(offsets, y, {
        threshold: viewportHeight * ACTIVE_LINE_FRACTION,
        atEnd,
      });
      if (next)
        setActive(prev => (prev === next ? prev : next));
    },
    [visible],
  );

  const scrollToSection = React.useCallback((key: HorseSectionKey) => {
    const y = offsetsRef.current[key];
    setActive(key);
    if (y == null)
      return;
    if (lockRef.current)
      clearTimeout(lockRef.current);
    lockRef.current = setTimeout(() => {
      lockRef.current = null;
    }, TAP_LOCK_MS);
    scrollRef.current?.scrollTo({ y: getSectionScrollTarget(y), animated: true });
  }, []);

  /** Scroll to an arbitrary content offset (e.g. a single update card). */
  const scrollToOffset = React.useCallback((y: number) => {
    scrollRef.current?.scrollTo({ y: getSectionScrollTarget(y), animated: true });
  }, []);

  const selected = active && visible.includes(active) ? active : visible[0];

  return { scrollRef, onSectionLayout, onScroll, scrollToSection, scrollToOffset, offsetsRef, selected };
}
