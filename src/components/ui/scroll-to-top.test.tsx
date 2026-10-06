import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import * as React from 'react';

import { useTabScrollToTop } from './scroll-to-top';

type Listener = (e: { defaultPrevented: boolean }) => void;

function fakeTabNavigation(focused: boolean) {
  const listeners: Listener[] = [];
  const nav = {
    getState: () => ({ type: 'tab', routes: [{ key: 'home' }] }),
    getParent: () => undefined,
    isFocused: () => focused,
    addListener: jest.fn((_type: string, cb: Listener) => {
      listeners.push(cb);
      return () => listeners.splice(listeners.indexOf(cb), 1);
    }),
  };
  const press = (defaultPrevented = false) => listeners.forEach(cb => cb({ defaultPrevented }));
  return { nav: nav as unknown as NavigationProp<ParamListBase>, press, listeners };
}

function Probe({ target }: { target: object }) {
  const ref = React.useRef<object>(target);
  useTabScrollToTop(ref);
  return null;
}

function mount(navigation: NavigationProp<ParamListBase> | undefined, target: object) {
  return render(
    <NavigationContext value={navigation}>
      <NavigationRouteContext value={{ key: 'home', name: 'index' }}>
        <Probe target={target} />
      </NavigationRouteContext>
    </NavigationContext>,
  );
}

describe('useTabScrollToTop (A-035)', () => {
  beforeEach(() => {
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('scrolls a ScrollView to the top when its focused tab is re-tapped', () => {
    const { nav, press } = fakeTabNavigation(true);
    const target = { scrollTo: jest.fn() };
    mount(nav, target);
    press();
    expect(target.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('uses scrollToOffset for FlashList', () => {
    const { nav, press } = fakeTabNavigation(true);
    const target = { scrollToOffset: jest.fn(), scrollTo: jest.fn() };
    mount(nav, target);
    press();
    expect(target.scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
    expect(target.scrollTo).not.toHaveBeenCalled();
  });

  it('ignores presses on an unfocused tab or a prevented event', () => {
    const unfocused = fakeTabNavigation(false);
    const target = { scrollTo: jest.fn() };
    mount(unfocused.nav, target);
    unfocused.press();
    const focused = fakeTabNavigation(true);
    mount(focused.nav, target);
    focused.press(true);
    expect(target.scrollTo).not.toHaveBeenCalled();
  });

  it('is a no-op outside a navigator and unsubscribes on unmount', () => {
    expect(() => mount(undefined, { scrollTo: jest.fn() })).not.toThrow();
    const { nav, listeners } = fakeTabNavigation(true);
    const { unmount } = mount(nav, { scrollTo: jest.fn() });
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
