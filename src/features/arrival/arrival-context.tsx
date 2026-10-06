import type { SharedValue } from 'react-native-reanimated';
import type { Rect } from './lib/arrival-geometry';
import type { ArrivalEvent, ArrivalState, SlotName } from './lib/arrival-machine';
import * as React from 'react';

import { IDLE_ARRIVAL } from './lib/arrival-machine';

/** UI-thread values the overlay renders and the timeline drives. */
export type ArrivalValues = {
  /** 0..1 outline draw. */
  progress: SharedValue<number>;
  /** 0..1 bottom-up fill. */
  fill: SharedValue<number>;
  /** The mark's transform from its base rect (lockup, flight). */
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  scale: SharedValue<number>;
  /** The mark's own opacity (welcome fade-in, swap with the real slot). */
  markOpacity: SharedValue<number>;
  /** Breathing multiplier while data is late. */
  breath: SharedValue<number>;
  /** The whole backdrop (+ letters, welcome content): fades out on hand-off. */
  backdrop: SharedValue<number>;
  /** The light gradient blooming over the plain white first frame. */
  bloom: SharedValue<number>;
  /** Signed out: light → navy, ink → cream. */
  navy: SharedValue<number>;
  /** Signed out: the wordmark letters' left-to-right wipe. */
  wipe: SharedValue<number>;
  /** The destination's real mark (Home header / login), hidden until the swap. */
  slot: SharedValue<number>;
};

export type WelcomeUser = { id?: string | null; name?: string | null };

export type ArrivalContextValue = {
  state: ArrivalState;
  values: ArrivalValues | null;
  dispatch: (event: ArrivalEvent) => void;
  reportSlot: (slot: SlotName, rect: Rect) => void;
  reportReady: (slot: SlotName) => void;
  /**
   * After a successful sign-in: cover the login screen with the welcome, then
   * call `onCovered` (navigate to Home underneath). The mark hands off to
   * Home's header once Home is ready.
   */
  beginWelcome: (user: WelcomeUser, onCovered: () => void) => void;
};

function noop() {}

/** No provider (tests, isolated screens): nothing plays, slots are visible. */
export const IDLE_CONTEXT: ArrivalContextValue = {
  state: IDLE_ARRIVAL,
  values: null,
  dispatch: noop,
  reportSlot: noop,
  reportReady: noop,
  beginWelcome: (_user, onCovered) => onCovered(),
};

export const ArrivalContext = React.createContext<ArrivalContextValue>(IDLE_CONTEXT);

export function useArrival(): ArrivalContextValue {
  return React.use(ArrivalContext);
}
