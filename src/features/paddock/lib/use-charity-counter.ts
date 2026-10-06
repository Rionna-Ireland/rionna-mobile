import type { SharedValue } from 'react-native-reanimated';
import type { CharitySurface, CountPlan } from './charity-counter';
import * as React from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { durations, playWave, timings, useMotion } from '@/lib/motion';
import { getItem, setItem } from '@/lib/storage';

import {
  countUpPlan,
  hasPlayedThisSession,
  lastSeenKey,
  markPlayedThisSession,
  parseLastSeen,
  wholeEuros,
} from './charity-counter';

export type CharityCounter = {
  /** The plan this surface shows (frozen once the moment starts). */
  plan: CountPlan;
  /** Whole euros, counting `plan.from` → `plan.to` on the UI thread. */
  count: SharedValue<number>;
  /** Goal-bar draw, 0 → 1 alongside the count (1 when static). */
  draw: SharedValue<number>;
  /** Pattern wave clock (ms), started when the count lands. */
  wave: SharedValue<number>;
  /** True once a wave will play: mount the lit layer only then. */
  waveArmed: boolean;
  /** Start the moment (visibility on Home, mount on Charity). Idempotent. */
  start: () => void;
};

type Seen = { lastSeenCents: number | null; played: boolean };

/** Reads storage lazily (first render), never at module load (MMKV/JSI rule). */
function readSeen(key: string): Seen {
  return { lastSeenCents: parseLastSeen(getItem<number>(key)), played: hasPlayedThisSession(key) };
}

/**
 * S14-06 charity counter for one surface: decides the start value from the
 * member's last-seen total, then (on `start`) counts up, draws the goal bar
 * and, when the count landed on a higher total, plays the pattern wave.
 * Persists the new last-seen total as the moment starts, once per session.
 */
export function useCharityCounter(surface: CharitySurface, totalCents: number): CharityCounter {
  const memberId = useAuthStore.use.user()?.id ?? '';
  const key = lastSeenKey(memberId, surface);
  const { reduceMotion } = useMotion();
  const [seen] = React.useState(() => readSeen(key));
  const [started, setStarted] = React.useState<CountPlan | null>(null);

  const live = React.useMemo(
    () => countUpPlan({ lastSeenCents: seen.lastSeenCents, totalCents, reduceMotion, playedThisSession: seen.played }),
    [seen, totalCents, reduceMotion],
  );
  const plan = started ?? live;

  const count = useSharedValue(live.from);
  const draw = useSharedValue(live.animate ? 0 : 1);
  const wave = useSharedValue(0);
  const startedRef = React.useRef(false);
  const appliedCents = React.useRef(totalCents);

  const start = React.useCallback(() => {
    if (startedRef.current)
      return;
    startedRef.current = true;
    appliedCents.current = totalCents;
    setStarted(live);
    if (seen.played)
      return;
    markPlayedThisSession(key);
    void setItem(key, totalCents);
    if (!live.animate) {
      count.set(live.to);
      draw.set(1);
      return;
    }
    count.set(live.from);
    draw.set(0);
    count.set(withTiming(live.to, timings.draw));
    draw.set(withTiming(1, timings.draw));
    playWave(wave, durations.draw);
  }, [live, seen.played, key, totalCents, count, draw, wave]);

  // A total that changes after the moment (refetch) just updates in place.
  React.useEffect(() => {
    if (!startedRef.current || appliedCents.current === totalCents)
      return;
    appliedCents.current = totalCents;
    count.set(wholeEuros(totalCents));
    draw.set(1);
    if (!seen.played)
      void setItem(key, totalCents);
  }, [totalCents, count, draw, key, seen.played]);

  return { plan, count, draw, wave, waveArmed: Boolean(started?.animate), start };
}
