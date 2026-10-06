import type { ArrivalValues } from './arrival-context';
import type { Rect, Size } from './lib/arrival-geometry';
import type { ArrivalEvent, ArrivalState } from './lib/arrival-machine';
import * as React from 'react';
import { withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { arrival, durations, haptics, springs, springSettleMs, timings } from '@/lib/motion';

import {
  centredMarkRect,
  flightTransform,
  isUsableRect,
  lockupRects,
  welcomeMarkRect,
} from './lib/arrival-geometry';
import { arrivalSchedule, signedOutIntroMs, targetSlot } from './lib/arrival-machine';

type Dispatch = (event: ArrivalEvent) => void;

export type TimelineArgs = {
  state: ArrivalState;
  dispatch: Dispatch;
  values: ArrivalValues;
  reduceMotion: boolean;
  window: Size;
  /** The route on screen: the flight only lands on the screen it targets. */
  pathname: string;
};

/** Where the mark sits (untransformed) for a run. */
export function baseRectFor(kind: ArrivalState['kind'], window: Size): Rect {
  return kind === 'welcome' ? welcomeMarkRect(window) : centredMarkRect(window);
}

/**
 * JS timers for one choreography. Every callback is guarded: if anything
 * throws, the arrival falls through to `done` instead of holding the app.
 */
function useTimers(dispatch: Dispatch) {
  const ids = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = React.useCallback(() => {
    ids.current.forEach(clearTimeout);
    ids.current = [];
  }, []);
  const after = React.useCallback((ms: number, fn: () => void) => {
    ids.current.push(setTimeout(() => {
      try {
        fn();
      }
      catch {
        dispatch({ type: 'FAIL' });
      }
    }, ms));
  }, [dispatch]);
  React.useEffect(() => clear, [clear]);
  return { after, clear };
}

function resetForWelcome(v: ArrivalValues) {
  v.progress.set(1);
  v.fill.set(1);
  v.tx.set(0);
  v.ty.set(0);
  v.scale.set(1);
  v.breath.set(1);
  v.bloom.set(1);
  v.navy.set(0);
  v.wipe.set(0);
  v.slot.set(0);
  v.markOpacity.set(0);
  v.backdrop.set(0);
  v.markOpacity.set(withTiming(1, timings.quick));
  v.backdrop.set(withTiming(1, timings.quick));
}

/** Per run: draw → fill (+ `land()`) → bloom, and the FILL/BREATHE/TIMEOUT timers. */
function useRunTimers({ state, dispatch, values: v, reduceMotion }: TimelineArgs) {
  const { after, clear } = useTimers(dispatch);
  const startedRef = React.useRef(0);
  const { run, kind } = state;
  const firstWelcome = state.welcome?.full ?? true;
  React.useEffect(() => {
    // Once per run: a reduce-motion flip mid-run doesn't restart it.
    if (run === 0 || startedRef.current === run)
      return;
    startedRef.current = run;
    clear();
    const schedule = arrivalSchedule(kind, reduceMotion, firstWelcome);
    if (kind === 'welcome') {
      resetForWelcome(v);
    }
    else if (reduceMotion) {
      v.bloom.set(withTiming(1, timings.quick));
      haptics.land();
    }
    else {
      v.progress.set(withTiming(1, timings.draw));
      v.fill.set(withDelay(schedule.fillAt, withTiming(1, timings.quick)));
      v.bloom.set(withDelay(schedule.fillDoneAt, withTiming(1, timings.enterSlow)));
      after(schedule.fillAt, () => haptics.land());
    }
    after(schedule.fillDoneAt, () => dispatch({ type: 'FILL_DONE' }));
    if (schedule.breatheAt !== null)
      after(schedule.breatheAt, () => dispatch({ type: 'BREATHE' }));
    after(schedule.timeoutAt, () => dispatch({ type: 'TIMEOUT' }));
  }, [run, kind, reduceMotion, firstWelcome, v, after, clear, dispatch]);
}

/** After the fill: signed out plays lockup → navy; everyone else is done at the fill. */
function useIntro({ state, dispatch, values: v, reduceMotion, window }: TimelineArgs) {
  const { after } = useTimers(dispatch);
  const playedRef = React.useRef(0);
  const { run } = state;
  const due = (state.phase === 'filled' || state.phase === 'waitingForData') && !state.introDone && state.mode !== null;
  const lockup = due && state.kind === 'launch' && state.mode === 'signedOut' && !reduceMotion;
  React.useEffect(() => {
    if (!due || playedRef.current === run)
      return;
    playedRef.current = run;
    if (!lockup) {
      dispatch({ type: 'INTRO_DONE' });
      return;
    }
    const t = flightTransform(centredMarkRect(window), lockupRects(window).head);
    v.tx.set(withSpring(t.translateX, springs.gentle));
    v.ty.set(withSpring(t.translateY, springs.gentle));
    v.scale.set(withSpring(t.scale, springs.gentle));
    v.wipe.set(withTiming(1, timings.enterSlow));
    v.navy.set(withDelay(durations.slow + arrival.lockupHoldMs, withTiming(1, timings.enter)));
    after(signedOutIntroMs(false), () => dispatch({ type: 'INTRO_DONE' }));
  }, [due, lockup, run, window, v, after, dispatch]);
}

/** Data late: the mark breathes (opacity 0.85 ↔ 1) until the hand-off. */
function useBreathing({ state, values: v, reduceMotion }: TimelineArgs) {
  const breathing = state.breathing && state.phase === 'waitingForData' && !reduceMotion;
  React.useEffect(() => {
    v.breath.set(breathing
      ? withRepeat(withTiming(arrival.breatheOpacity, timings.breathe), -1, true)
      : withTiming(1, timings.quick));
  }, [breathing, v.breath]);
}

/** The screen the mark should land on is the one showing. */
export function routeMatches(mode: ArrivalState['mode'], pathname: string): boolean {
  if (mode === 'signedIn')
    return pathname === '/';
  if (mode === 'signedOut')
    return pathname === '/login';
  return false;
}

/**
 * Hand-off: fly the mark onto the destination's slot (`hero` spring) while
 * the backdrop fades and the screen shows through; then swap the overlay mark
 * for the real one in the same frame. Reduce Motion, no measured slot, or the
 * wrong screen showing: a `quick` crossfade instead.
 */
function useHandOff({ state, dispatch, values: v, reduceMotion, window, pathname }: TimelineArgs) {
  const { after } = useTimers(dispatch);
  const handledRef = React.useRef(0);
  const { run, kind, mode, slots } = state;
  const handingOff = state.phase === 'handingOff';
  React.useEffect(() => {
    if (!handingOff || handledRef.current === run)
      return;
    handledRef.current = run;
    const target = targetSlot(mode);
    const slot = target ? slots[target] : null;
    v.breath.set(withTiming(1, timings.quick));
    if (reduceMotion || !isUsableRect(slot, window) || !routeMatches(mode, pathname)) {
      v.backdrop.set(withTiming(0, timings.quick));
      v.markOpacity.set(withTiming(0, timings.quick));
      v.slot.set(withTiming(1, timings.quick));
      after(durations.quick, () => dispatch({ type: 'HANDOFF_DONE' }));
      return;
    }
    const t = flightTransform(baseRectFor(kind, window), slot);
    v.tx.set(withSpring(t.translateX, springs.hero));
    v.ty.set(withSpring(t.translateY, springs.hero));
    v.scale.set(withSpring(t.scale, springs.hero));
    v.backdrop.set(withTiming(0, timings.enterSlow));
    after(springSettleMs('hero'), () => {
      // Same frame: both writes land in one UI-thread batch.
      v.markOpacity.set(0);
      v.slot.set(1);
      dispatch({ type: 'HANDOFF_DONE' });
    });
  }, [handingOff, run, kind, mode, slots, reduceMotion, window, pathname, v, after, dispatch]);
}

/** Drives the shared values from the state machine (S14-04 §1–7). */
export function useArrivalTimeline(args: TimelineArgs) {
  useRunTimers(args);
  useIntro(args);
  useBreathing(args);
  useHandOff(args);
}
