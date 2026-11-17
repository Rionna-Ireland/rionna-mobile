import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import * as React from 'react';

import { useScreenTopPadding } from './screen-layout';

/**
 * Whether a full-bleed header or hero has scrolled out from under the status
 * bar (A-012), so the status bar can flip to dark. State flips only on change.
 */
export function usePastHeader() {
  const topInset = useScreenTopPadding(0);
  const headerHeight = React.useRef(0);
  const [pastHeader, setPastHeader] = React.useState(false);
  const onHeaderHeight = React.useCallback((height: number) => {
    headerHeight.current = height;
  }, []);
  const onScroll = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const height = headerHeight.current;
    const next = height > 0 && e.nativeEvent.contentOffset.y > height - topInset;
    setPastHeader(prev => (prev === next ? prev : next));
  }, [topInset]);
  return { pastHeader, onHeaderHeight, onScroll };
}
