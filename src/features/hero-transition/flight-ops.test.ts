import type { FlightCtx, FlightValues } from './flight-ops';
import type { HeroEnv, HeroRegistry } from './navigation';
import type { Flight, HeroDestinationInfo, HeroSource } from './types';

import { durations, heroFlightCapMs, heroTransition, springSettleMs } from '@/lib/motion';

import {
  beginFlight,
  crossfadeOut,
  destinationReady,
  EMPTY_GEOMETRY,
  landFlight,
  startFlight,
} from './flight-ops';
import { closeToSource, openFromSource } from './navigation';

function sv<T>(initial: T) {
  const box = {
    value: initial,
    get: () => box.value,
    set: (next: T) => {
      box.value = next;
    },
  };
  return box as unknown as FlightValues['progress'] & { value: T };
}

function makeCtx() {
  const flights: (Flight | null)[] = [];
  const values = {
    progress: sv(0),
    opacity: sv(1),
    geometry: sv(EMPTY_GEOMETRY),
    watching: sv(false),
    reveal: { shown: sv(1), details: sv(1), name: sv(1) },
  } as unknown as FlightValues;
  const ctx: FlightCtx = {
    values,
    runtime: { current: null },
    nextId: { current: 0 },
    setFlight: f => flights.push(f),
  };
  return { ctx, flights, values };
}

const card = { x: 16, y: 300, width: 86, height: 146 };

function makeSource(overrides: Partial<HeroSource> = {}): HeroSource {
  return {
    key: 'stables:h1',
    horseId: 'h1',
    name: 'Laska',
    uri: 'https://img/laska.jpg?width=400&quality=80',
    heroUri: 'https://img/laska.jpg?width=1000&quality=80',
    radius: 8,
    measure: jest.fn(async () => card),
    measureName: jest.fn(async () => ({ x: 118, y: 316, width: 240, height: 56 })),
    aspect: () => 1.5,
    hidden: sv(0),
    ...overrides,
  };
}

const env: HeroEnv = {
  reduceMotion: false,
  lowEnd: false,
  width: 390,
  viewport: { x: 0, y: 100, width: 390, height: 640 },
};

function registryWith(source?: HeroSource, dest?: Partial<HeroDestinationInfo>): HeroRegistry {
  const registry: HeroRegistry = { sources: new Map(), destinations: new Map(), openedFrom: new Map() };
  if (source)
    registry.sources.set(source.key, source);
  if (dest) {
    registry.destinations.set('h1', {
      heroHeight: 390,
      nameRect: { x: 16, y: 260, width: 358, height: 48 },
      nameScroll: 0,
      photoIndex: 0,
      photoUri: source?.heroUri ?? null,
      scrollY: sv(0),
      ...dest,
    });
    registry.openedFrom.set('h1', 'stables:h1');
  }
  return registry;
}

const value = (x: unknown) => (x as { value: unknown }).value;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('opening a horse', () => {
  it('crossfades under Reduce Motion and on low-end Android, without an overlay', async () => {
    const { ctx, flights } = makeCtx();
    const registry = registryWith(makeSource());
    await expect(openFromSource({ ctx, env: { ...env, reduceMotion: true }, registry }, 'h1', 'stables:h1')).resolves.toBe('fade');
    await expect(openFromSource({ ctx, env: { ...env, lowEnd: true }, registry }, 'h1', 'stables:h1')).resolves.toBe('fade');
    expect(flights).toEqual([]);
  });

  it('uses the default push without a usable source (deep link, photo not drawn yet)', async () => {
    const { ctx } = makeCtx();
    await expect(openFromSource({ ctx, env, registry: registryWith() }, 'h1')).resolves.toBe('default');
    const undrawn = registryWith(makeSource({ aspect: () => null }));
    await expect(openFromSource({ ctx, env, registry: undrawn }, 'h1', 'stables:h1')).resolves.toBe('default');
  });

  it('crossfades when the source is partly under the chrome', async () => {
    const { ctx } = makeCtx();
    const registry = registryWith(makeSource({ measure: jest.fn(async () => ({ ...card, y: 80 })) }));
    await expect(openFromSource({ ctx, env, registry }, 'h1', 'stables:h1')).resolves.toBe('fade');
  });

  it('mounts the overlay at the source and hides the hero until it lands', async () => {
    const { ctx, flights, values } = makeCtx();
    const registry = registryWith(makeSource());
    await expect(openFromSource({ ctx, env, registry }, 'h1', 'stables:h1')).resolves.toBe('hero');
    expect(flights[0]).toMatchObject({ horseId: 'h1', direction: 'forward', name: 'Laska', baseUri: expect.stringContaining('width=400') });
    expect(flights[0]?.topUri).toContain('width=1000');
    const geometry = value(values.geometry) as typeof EMPTY_GEOMETRY;
    expect(geometry.fromClip).toEqual(card);
    expect(geometry.toClip).toEqual({ x: 0, y: 0, width: 390, height: 390 });
    expect(geometry.fromRadius).toBe(8);
    expect(value(values.reveal.shown)).toBe(0);
    expect(registry.openedFrom.get('h1')).toBe('stables:h1');
  });
});

describe('the forward flight', () => {
  async function opened() {
    const made = makeCtx();
    const source = makeSource();
    await openFromSource({ ctx: made.ctx, env, registry: registryWith(source) }, 'h1', 'stables:h1');
    return { ...made, source, id: made.ctx.runtime.current!.id };
  }

  it('hands off to the hero once it has landed AND the hero photo has drawn', async () => {
    const { ctx, values, flights, source, id } = await opened();
    startFlight(ctx, id, landed => landFlight(ctx, landed));
    expect(value(source.hidden)).toBe(1);
    expect(value(values.watching)).toBe(true);

    landFlight(ctx, id);
    expect(value(values.reveal.shown)).toBe(0);
    destinationReady(ctx, 'h1');
    expect(value(values.reveal.shown)).toBe(1);
    expect(value(values.opacity)).toBe(0);
    expect(value(source.hidden)).toBe(0);

    jest.advanceTimersByTime(durations.quick + heroTransition.safetyMarginMs);
    expect(flights.at(-1)).toBeNull();
    expect(ctx.runtime.current).toBeNull();
  });

  it('crossfades out if the hero never draws within the hold', async () => {
    const { ctx, values, flights, id } = await opened();
    startFlight(ctx, id, () => {});
    landFlight(ctx, id);
    jest.advanceTimersByTime(springSettleMs('hero') + heroTransition.holdMaxMs);
    expect(value(values.opacity)).toBe(0);
    expect(value(values.reveal.shown)).toBe(1);
    jest.advanceTimersByTime(durations.quick + heroTransition.safetyMarginMs);
    expect(flights.at(-1)).toBeNull();
  });

  it('gives up before flying if the overlay photo never draws', async () => {
    const { values, source, flights } = await opened();
    jest.advanceTimersByTime(heroTransition.imageWaitMs);
    expect(value(values.reveal.shown)).toBe(1);
    expect(value(source.hidden)).toBe(0);
    jest.advanceTimersByTime(durations.quick + heroTransition.safetyMarginMs);
    expect(flights.at(-1)).toBeNull();
  });

  it('aborts to a crossfade when frames drop', async () => {
    const { ctx, values, id } = await opened();
    startFlight(ctx, id, () => {});
    crossfadeOut(ctx, id);
    expect(value(values.opacity)).toBe(0);
    expect(value(values.watching)).toBe(false);
    // A late landing after the abort doesn't swap again.
    landFlight(ctx, id);
    destinationReady(ctx, 'h1');
    expect(value(values.opacity)).toBe(0);
  });

  it('is always gone by the cap', async () => {
    const { ctx, flights, id } = await opened();
    startFlight(ctx, id, () => {});
    jest.advanceTimersByTime(heroFlightCapMs());
    expect(flights.at(-1)).toBeNull();
    expect(ctx.runtime.current).toBeNull();
  });

  it('replaces a flight still in the air', async () => {
    const { ctx, flights } = await opened();
    beginFlight(ctx, {
      horseId: 'h2',
      direction: 'forward',
      source: makeSource({ key: 'stables:h2', horseId: 'h2' }),
      geometry: EMPTY_GEOMETRY,
      baseUri: 'a',
      topUri: null,
      imageBase: { width: 1, height: 1 },
      name: null,
    });
    expect(flights.map(f => f?.horseId ?? null)).toEqual(['h1', null, 'h2']);
  });
});

describe('closing a horse', () => {
  it('flies back into the re-measured source, popping once the overlay has drawn', async () => {
    const { ctx, flights, values } = makeCtx();
    const source = makeSource();
    const pop = jest.fn();
    await closeToSource({ ctx, env, registry: registryWith(source, {}) }, 'h1', pop);
    expect(flights[0]).toMatchObject({ direction: 'reverse', baseUri: source.heroUri, topUri: null });
    expect(pop).not.toHaveBeenCalled();
    const id = ctx.runtime.current!.id;
    startFlight(ctx, id, () => {});
    expect(pop).toHaveBeenCalledTimes(1);
    expect(value(values.reveal.shown)).toBe(0);
    landFlight(ctx, id);
    expect(value(source.hidden)).toBe(0);
    expect(value(values.opacity)).toBe(0);
    jest.advanceTimersByTime(durations.instant);
    expect(flights.at(-1)).toBeNull();
  });

  it('just pops when the source has gone off screen, the hero is on another photo, or it was scrolled away', async () => {
    const cases: [HeroSource, Partial<HeroDestinationInfo>][] = [
      [makeSource({ measure: jest.fn(async () => ({ ...card, y: 900 })) }), {}],
      [makeSource(), { photoIndex: 2 }],
      [makeSource(), { scrollY: sv(300) }],
      [makeSource(), { photoUri: null }],
    ];
    for (const [source, dest] of cases) {
      const { ctx, flights } = makeCtx();
      const pop = jest.fn();
      await closeToSource({ ctx, env, registry: registryWith(source, dest) }, 'h1', pop);
      expect(pop).toHaveBeenCalledTimes(1);
      expect(flights).toEqual([]);
    }
  });

  it('just pops under Reduce Motion', async () => {
    const { ctx, flights } = makeCtx();
    const pop = jest.fn();
    await closeToSource({ ctx, env: { ...env, reduceMotion: true }, registry: registryWith(makeSource(), {}) }, 'h1', pop);
    expect(pop).toHaveBeenCalledTimes(1);
    expect(flights).toEqual([]);
  });

  it('pops even if the reverse overlay never draws', async () => {
    const { ctx } = makeCtx();
    const pop = jest.fn();
    await closeToSource({ ctx, env, registry: registryWith(makeSource(), {}) }, 'h1', pop);
    jest.advanceTimersByTime(heroTransition.imageWaitMs);
    expect(pop).toHaveBeenCalledTimes(1);
  });
});
