import type { Rect } from './arrival-geometry';
import { arrival, durations } from '@/lib/motion';

/**
 * Arrival state machine (S14-04 §3). Pure: the provider feeds it events from
 * timers, auth, and the destination screen's slot/data reports.
 *
 *   drawing → filled → waitingForData → handingOff → done
 *
 * The animation and the bootstrap run in parallel; the hand-off starts at
 * `max(introDone, dataReady + slotMeasured)`. A timeout (a fixed cap after the
 * fill) forces the hand-off so the splash can never hold the app hostage, and
 * FAIL drops straight to `done`.
 */

export type ArrivalKind = 'launch' | 'welcome';
export type ArrivalMode = 'signedIn' | 'signedOut';
export type ArrivalPhase = 'drawing' | 'filled' | 'waitingForData' | 'handingOff' | 'done';
export type SlotName = 'home' | 'login';

export type ArrivalState = {
  /** Increments per run: the cold launch is 1, each welcome after sign-in adds one. */
  run: number;
  kind: ArrivalKind;
  /** Where the arrival lands. `null` while auth is still hydrating. */
  mode: ArrivalMode | null;
  phase: ArrivalPhase;
  /** The pre-hand-off choreography has played (fill, + lockup/navy when signed out). */
  introDone: boolean;
  ready: Partial<Record<SlotName, boolean>>;
  slots: Partial<Record<SlotName, Rect>>;
  /** Data is late: the mark breathes. */
  breathing: boolean;
  /** The data-wait cap fired: hand off whatever the state. */
  timedOut: boolean;
  welcome: { name: string | null; full: boolean } | null;
};

export type ArrivalEvent
  = | { type: 'MODE'; mode: ArrivalMode }
    | { type: 'FILL_DONE' }
    | { type: 'INTRO_DONE' }
    | { type: 'READY'; slot: SlotName }
    | { type: 'SLOT'; slot: SlotName; rect: Rect }
    | { type: 'BREATHE' }
    | { type: 'TIMEOUT' }
    | { type: 'HANDOFF_DONE' }
    | { type: 'FAIL' }
    | { type: 'WELCOME'; name: string | null; full: boolean };

export function initialArrivalState(mode: ArrivalMode | null): ArrivalState {
  return {
    run: 1,
    kind: 'launch',
    mode,
    phase: 'drawing',
    introDone: false,
    ready: {},
    slots: {},
    breathing: false,
    timedOut: false,
    welcome: null,
  };
}

/** The state of an app that never plays the arrival (tests, no provider). */
export const IDLE_ARRIVAL: ArrivalState = { ...initialArrivalState(null), run: 0, phase: 'done' };

/** The screen slot the mark lands in. */
export function targetSlot(mode: ArrivalMode | null): SlotName | null {
  if (mode === 'signedIn')
    return 'home';
  if (mode === 'signedOut')
    return 'login';
  return null;
}

export function isActive(state: ArrivalState): boolean {
  return state.phase !== 'done';
}

export function canHandOff(state: ArrivalState): boolean {
  if (state.timedOut)
    return true;
  const slot = targetSlot(state.mode);
  if (!state.introDone || slot === null || !state.slots[slot])
    return false;
  // The login screen has no data to wait for: measured is ready.
  return slot === 'login' || !!state.ready[slot];
}

function advance(state: ArrivalState): ArrivalState {
  const waiting = state.phase === 'filled' || state.phase === 'waitingForData';
  const stuck = state.timedOut && state.phase === 'drawing';
  if ((waiting || stuck) && canHandOff(state))
    return { ...state, phase: 'handingOff', breathing: false };
  if (state.phase === 'filled' && state.introDone)
    return { ...state, phase: 'waitingForData' };
  return state;
}

function settled(state: ArrivalState): boolean {
  return state.phase === 'handingOff' || state.phase === 'done';
}

export function arrivalReducer(state: ArrivalState, event: ArrivalEvent): ArrivalState {
  if (event.type === 'WELCOME') {
    return {
      ...initialArrivalState('signedIn'),
      run: state.run + 1,
      kind: 'welcome',
      slots: state.slots,
      welcome: { name: event.name, full: event.full },
    };
  }
  if (state.phase === 'done')
    return state;
  switch (event.type) {
    case 'FAIL':
    case 'HANDOFF_DONE':
      return { ...state, phase: 'done', breathing: false };
    case 'MODE':
      return settled(state) ? state : advance({ ...state, mode: event.mode });
    case 'FILL_DONE':
      return state.phase === 'drawing' ? advance({ ...state, phase: 'filled' }) : state;
    case 'INTRO_DONE':
      return advance({ ...state, introDone: true });
    case 'READY':
      return advance({ ...state, ready: { ...state.ready, [event.slot]: true } });
    case 'SLOT':
      return advance({ ...state, slots: { ...state.slots, [event.slot]: event.rect } });
    case 'BREATHE':
      return state.phase === 'waitingForData' ? { ...state, breathing: true } : state;
    case 'TIMEOUT':
      return settled(state) ? state : advance({ ...state, timedOut: true });
    default:
      return state;
  }
}

export type ArrivalSchedule = {
  /** The fill starts (and `land()` fires) at this offset (ms). */
  fillAt: number;
  /** FILL_DONE: the mark is complete (or the welcome's minimum time is up). */
  fillDoneAt: number;
  /** BREATHE fires here if data is still late; `null`: never breathes. */
  breatheAt: number | null;
  /** TIMEOUT: hand off regardless. */
  timeoutAt: number;
};

/** Timer offsets (ms from the run's start) for a run. */
export function arrivalSchedule(
  kind: ArrivalKind,
  reduceMotion: boolean,
  firstWelcome = true,
): ArrivalSchedule {
  if (kind === 'welcome') {
    const fillDoneAt = firstWelcome ? arrival.welcomeMinMs : arrival.welcomeRepeatMinMs;
    return { fillAt: 0, fillDoneAt, breatheAt: null, timeoutAt: fillDoneAt + arrival.maxDataWaitMs };
  }
  if (reduceMotion) {
    const fillDoneAt = durations.quick;
    return { fillAt: 0, fillDoneAt, breatheAt: null, timeoutAt: fillDoneAt + arrival.maxDataWaitMs };
  }
  const fillDoneAt = durations.draw + durations.quick;
  return {
    fillAt: durations.draw,
    fillDoneAt,
    breatheAt: fillDoneAt + arrival.dataGraceMs,
    timeoutAt: fillDoneAt + arrival.maxDataWaitMs,
  };
}

/**
 * Signed-out cold launch, after the fill: the mark settles into the lockup as
 * the letters wipe in (`slow`), the lockup holds, then light → navy (`base`).
 * Reduce Motion skips straight to the crossfade hand-off.
 */
export function signedOutIntroMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : durations.slow + arrival.lockupHoldMs + durations.base;
}
