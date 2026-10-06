import type { ArrivalContextValue, WelcomeUser } from './arrival-context';
import type { Rect } from './lib/arrival-geometry';
import type { ArrivalMode, ArrivalState, SlotName } from './lib/arrival-machine';
import { usePathname } from 'expo-router';
import * as React from 'react';
import { useWindowDimensions } from 'react-native';

import { durations, useMotion } from '@/lib/motion';

import { ArrivalContext } from './arrival-context';
import { arrivalReducer, initialArrivalState, targetSlot } from './lib/arrival-machine';
import { reportArrival, sinceStart } from './lib/arrival-metrics';
import { hideNativeSplash } from './lib/native-splash';
import { hasSeenWelcome, markWelcomeSeen } from './lib/welcome-flag';
import { useArrivalTimeline } from './use-arrival-timeline';
import { useArrivalValues } from './use-arrival-values';

type AuthStatus = 'idle' | 'signIn' | 'signOut';

function modeFor(status: AuthStatus): ArrivalMode | null {
  if (status === 'signIn')
    return 'signedIn';
  if (status === 'signOut')
    return 'signedOut';
  return null;
}

type RunMarks = { run: number; start: number; tti: number | null; data: number | null; reported: boolean };

/** Times each run from its start; reports `ttiMs` / `arrivalMs` when it ends (dev log). */
function useArrivalMetrics(state: ArrivalState) {
  const marksRef = React.useRef<RunMarks>({ run: 0, start: 0, tti: null, data: null, reported: false });
  const { run, phase, kind, mode, timedOut } = state;
  const slot = targetSlot(mode);
  const dataReady = slot ? !!state.ready[slot] : false;
  React.useEffect(() => {
    let m = marksRef.current;
    if (m.run !== run) {
      // The cold launch counts from the bundle start; a welcome from its sign-in.
      m = { run, start: run <= 1 ? 0 : sinceStart(), tti: null, data: null, reported: false };
      marksRef.current = m;
    }
    if (dataReady && m.data === null)
      m.data = sinceStart() - m.start;
    if (phase === 'handingOff' && m.tti === null)
      m.tti = sinceStart() - m.start;
    if (phase === 'done' && run > 0 && !m.reported) {
      m.reported = true;
      reportArrival({ kind, mode, ttiMs: m.tti, arrivalMs: sinceStart() - m.start, dataReadyMs: m.data, timedOut });
    }
  }, [run, phase, kind, mode, timedOut, dataReady]);
}

/** Mark the welcome seen once it has played for `userRef`'s member. */
function useWelcomeFlag(state: ArrivalState, userRef: React.RefObject<string | null>) {
  const { kind, phase } = state;
  const full = state.welcome?.full ?? false;
  React.useEffect(() => {
    if (kind === 'welcome' && phase === 'done' && full)
      markWelcomeSeen(userRef.current);
  }, [kind, phase, full, userRef]);
}

export type ArrivalProviderProps = {
  /** Auth status: decides where the cold-launch arrival lands. */
  status: AuthStatus;
  children: React.ReactNode;
};

/**
 * Owns the Arrival (S14-04): one choreography per cold launch (never on warm
 * starts: the root never remounts on resume), plus the welcome after a
 * sign-in. Mount it at the root, above the navigator, with `ArrivalOverlay`.
 */
export function ArrivalProvider({ status, children }: ArrivalProviderProps) {
  const { reduceMotion } = useMotion();
  const [state, dispatch] = React.useReducer(arrivalReducer, status, s => initialArrivalState(modeFor(s)));
  const values = useArrivalValues(reduceMotion);
  const window = useWindowDimensions();
  const pathname = usePathname();
  const welcomeUserRef = React.useRef<string | null>(null);
  useWelcomeFlag(state, welcomeUserRef);

  React.useEffect(() => {
    const mode = modeFor(status);
    if (mode)
      dispatch({ type: 'MODE', mode });
  }, [status]);

  // Failsafe: whatever happens to the overlay, the native splash goes.
  React.useEffect(() => {
    if (state.phase === 'done')
      hideNativeSplash();
  }, [state.phase]);

  useArrivalTimeline({ state, dispatch, values, reduceMotion, window, pathname });
  useArrivalMetrics(state);

  const reportSlot = React.useCallback((slot: SlotName, rect: Rect) => dispatch({ type: 'SLOT', slot, rect }), []);
  const reportReady = React.useCallback((slot: SlotName) => dispatch({ type: 'READY', slot }), []);
  const beginWelcome = React.useCallback((user: WelcomeUser, onCovered: () => void) => {
    welcomeUserRef.current = user.id ?? null;
    dispatch({ type: 'WELCOME', name: user.name ?? null, full: !hasSeenWelcome(user.id) });
    // Navigate underneath once the welcome covers the login screen.
    setTimeout(() => {
      try {
        onCovered();
      }
      catch {
        dispatch({ type: 'FAIL' });
      }
    }, durations.quick);
  }, []);

  const value = React.useMemo<ArrivalContextValue>(
    () => ({ state, values, dispatch, reportSlot, reportReady, beginWelcome }),
    [state, values, reportSlot, reportReady, beginWelcome],
  );
  return <ArrivalContext value={value}>{children}</ArrivalContext>;
}
