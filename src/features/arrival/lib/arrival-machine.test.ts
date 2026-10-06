import type { ArrivalEvent, ArrivalState } from './arrival-machine';
import { arrival } from '@/lib/motion';

import {
  arrivalReducer,
  arrivalSchedule,
  canHandOff,
  IDLE_ARRIVAL,
  initialArrivalState,
  signedOutIntroMs,
  targetSlot,
} from './arrival-machine';

const RECT = { x: 16, y: 60, width: 36, height: 32 };

function run(state: ArrivalState, ...events: ArrivalEvent[]): ArrivalState {
  return events.reduce(arrivalReducer, state);
}

describe('arrival machine', () => {
  it('targets Home when signed in and the login mark when signed out', () => {
    expect(targetSlot('signedIn')).toBe('home');
    expect(targetSlot('signedOut')).toBe('login');
    expect(targetSlot(null)).toBeNull();
  });

  it('data early: still completes the fill, then hands off at the fill', () => {
    const s = run(
      initialArrivalState('signedIn'),
      { type: 'READY', slot: 'home' },
      { type: 'SLOT', slot: 'home', rect: RECT },
    );
    expect(s.phase).toBe('drawing');
    expect(run(s, { type: 'FILL_DONE' }).phase).toBe('filled');
    expect(run(s, { type: 'FILL_DONE' }, { type: 'INTRO_DONE' }).phase).toBe('handingOff');
  });

  it('data late: waits, breathes, then hands off the moment data lands', () => {
    let s = run(initialArrivalState('signedIn'), { type: 'FILL_DONE' }, { type: 'INTRO_DONE' });
    expect(s.phase).toBe('waitingForData');
    s = run(s, { type: 'BREATHE' });
    expect(s.breathing).toBe(true);
    s = run(s, { type: 'SLOT', slot: 'home', rect: RECT });
    expect(s.phase).toBe('waitingForData');
    s = run(s, { type: 'READY', slot: 'home' });
    expect(s).toMatchObject({ phase: 'handingOff', breathing: false });
    expect(run(s, { type: 'HANDOFF_DONE' }).phase).toBe('done');
  });

  it('never breathes outside the wait', () => {
    expect(run(initialArrivalState('signedIn'), { type: 'BREATHE' }).breathing).toBe(false);
  });

  it('timeout forces the hand-off, even without a slot or a mode', () => {
    const s = run(initialArrivalState(null), { type: 'FILL_DONE' }, { type: 'INTRO_DONE' }, { type: 'TIMEOUT' });
    expect(s.phase).toBe('handingOff');
    expect(canHandOff(s)).toBe(true);
    expect(run(initialArrivalState(null), { type: 'TIMEOUT' }).phase).toBe('handingOff');
  });

  it('waits for the auth mode before handing off', () => {
    let s = run(
      initialArrivalState(null),
      { type: 'FILL_DONE' },
      { type: 'INTRO_DONE' },
      { type: 'SLOT', slot: 'login', rect: RECT },
    );
    expect(s.phase).toBe('waitingForData');
    s = run(s, { type: 'MODE', mode: 'signedOut' });
    expect(s.phase).toBe('handingOff');
  });

  it('fAIL drops straight to done and done is terminal', () => {
    const s = run(initialArrivalState('signedIn'), { type: 'FAIL' });
    expect(s.phase).toBe('done');
    expect(run(s, { type: 'FILL_DONE' }, { type: 'TIMEOUT' })).toBe(s);
  });

  it('a welcome starts a new run aimed at Home, keeping measured slots', () => {
    const done = run(initialArrivalState('signedOut'), { type: 'SLOT', slot: 'home', rect: RECT }, { type: 'FAIL' });
    const s = run(done, { type: 'WELCOME', name: 'Tom', full: true });
    expect(s).toMatchObject({ run: 2, kind: 'welcome', mode: 'signedIn', phase: 'drawing', ready: {} });
    expect(s.slots.home).toEqual(RECT);
    expect(s.welcome).toEqual({ name: 'Tom', full: true });
  });

  it('idle state is inactive', () => {
    expect(IDLE_ARRIVAL.phase).toBe('done');
  });
});

describe('arrival schedule', () => {
  it('signed-in cold launch: draw + fill lands inside the 1.2s cap', () => {
    const s = arrivalSchedule('launch', false);
    expect(s.fillAt).toBe(900);
    expect(s.fillDoneAt).toBeLessThanOrEqual(arrival.signedInCapMs);
    expect(s.breatheAt).toBe(s.fillDoneAt + 300);
    expect(s.timeoutAt).toBe(s.fillDoneAt + arrival.maxDataWaitMs);
  });

  it('reduce motion: filled at once, no breathing', () => {
    expect(arrivalSchedule('launch', true)).toMatchObject({ fillAt: 0, breatheAt: null });
  });

  it('welcome: 1.6s minimum on first login, short on repeats', () => {
    expect(arrivalSchedule('welcome', false).fillDoneAt).toBe(1600);
    expect(arrivalSchedule('welcome', false, false).fillDoneAt).toBe(arrival.welcomeRepeatMinMs);
  });

  it('signed-out intro is ~2s end to end, skipped under reduce motion', () => {
    const total = arrivalSchedule('launch', false).fillDoneAt + signedOutIntroMs(false);
    expect(total).toBeGreaterThan(1800);
    expect(total).toBeLessThan(2200);
    expect(signedOutIntroMs(true)).toBe(0);
  });
});
