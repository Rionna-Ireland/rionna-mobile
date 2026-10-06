import type { EventArg, NavigationProp, ParamListBase } from '@react-navigation/native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import * as React from 'react';

/** Anything with one of the scroll-to-top methods: ScrollView, Animated.ScrollView, FlashList. */
export type ScrollToTopTarget = {
  scrollTo?: (options: { y: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

function scrollToTop(target: ScrollToTopTarget | null) {
  if (!target)
    return;
  if (typeof target.scrollToOffset === 'function')
    target.scrollToOffset({ offset: 0, animated: true });
  else if (typeof target.scrollTo === 'function')
    target.scrollTo({ y: 0, animated: true });
}

/**
 * Re-tapping the active tab scrolls its root back to the top (A-035; the iOS
 * convention, and Material's for top-level destinations). Mirrors React
 * Navigation's `useScrollToTop`, but is a no-op outside a navigator (screens
 * render bare in tests and the dev gallery). Only the tab's first screen
 * scrolls; screens pushed above it are left alone. No haptic, as before.
 */
export function useTabScrollToTop(ref: React.RefObject<unknown>) {
  const navigation = React.use(NavigationContext) as NavigationProp<ParamListBase> | undefined;
  const route = React.use(NavigationRouteContext);
  const routeKey = route?.key;

  React.useEffect(() => {
    if (!navigation)
      return;
    const tabs: NavigationProp<ParamListBase>[] = [];
    let current: NavigationProp<ParamListBase> | undefined = navigation;
    while (current) {
      if (current.getState()?.type === 'tab')
        tabs.push(current);
      current = current.getParent();
    }
    const unsubscribers = tabs.map(tab =>
      // `tabPress` is only typed on tab navigators.
      (tab.addListener as (type: string, cb: (e: EventArg<'tabPress', true>) => void) => () => void)('tabPress', (e) => {
        const isFocused = navigation.isFocused();
        const isFirst = tabs.includes(navigation) || navigation.getState()?.routes[0]?.key === routeKey;
        // Next frame: every listener has run, so `defaultPrevented` is settled.
        requestAnimationFrame(() => {
          if (isFocused && isFirst && !e.defaultPrevented)
            scrollToTop(ref.current as ScrollToTopTarget | null);
        });
      }));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [navigation, ref, routeKey]);
}
