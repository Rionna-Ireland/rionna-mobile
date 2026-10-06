import type { SharedValue } from 'react-native-reanimated';
import type { Rect } from './hero-math';

/** A tappable horse photo the hero can fly out of (and back into). */
export type HeroSource = {
  /** Unique per surface + horse, e.g. `stables:<horseId>`. */
  key: string;
  horseId: string;
  /** The exact URL the source draws (already in the image cache). */
  uri: string;
  /** The URL the detail hero draws for the same photo. */
  heroUri: string;
  /** The horse's name, drawn by the overlay as it reflows into the hero headline. */
  name?: string;
  /** Corner radius of the source photo (pt); the flight morphs it to 0. */
  radius: number;
  /** Window rect of the photo, or null if it isn't laid out. */
  measure: () => Promise<Rect | null>;
  /** Window rect of the source's name label (the Stables card), if it has one. */
  measureName?: () => Promise<Rect | null>;
  /** Natural aspect (width / height) of the loaded photo; null until it has drawn. */
  aspect: () => number | null;
  /** 1 hides the source photo while the overlay stands in for it. */
  hidden: SharedValue<number>;
};

/** The detail hero's visibility during a flight (all 1 at rest). */
export type HeroReveal = {
  /** The whole hero (photo, scrim, text). 0 until the overlay lands. */
  shown: SharedValue<number>;
  /** Everything but the photo and name: profile lines, pills, dots, the pinned bar. */
  details: SharedValue<number>;
  /** The display name (the overlay draws it during the flight). */
  name: SharedValue<number>;
};

export type FlightDirection = 'forward' | 'reverse';

/** Overlay endpoints. `p` runs 0 → 1 from `from*` to `to*` in both directions. */
export type FlightGeometry = {
  fromClip: Rect;
  fromImage: Rect;
  toClip: Rect;
  toImage: Rect;
  fromRadius: number;
  toRadius: number;
  /** Where the card-style name sits (source end); null: no card name. */
  cardName: Rect | null;
  /** Where the hero-style name sits (detail end); null until the hero reports it. */
  heroName: Rect | null;
};

/** What the overlay renders (React state; the geometry lives in shared values). */
export type Flight = {
  id: number;
  horseId: string;
  direction: FlightDirection;
  /** Drawn first: a URL the cache already holds, so the first frame has pixels. */
  baseUri: string;
  /** Drawn over the base once loaded (the hero's sharper photo), or null. */
  topUri: string | null;
  /** Fixed layout size of the inner image; the flight only transforms it. */
  imageBase: { width: number; height: number };
  name: string | null;
};

/** How the detail screen is pushed. */
export type PushMode = 'hero' | 'fade' | 'default';

/** What the detail screen tells the controller about its hero. */
export type HeroDestinationInfo = {
  heroHeight: number;
  /** The display name's window rect, and the scroll offset it was measured at. */
  nameRect: Rect | null;
  nameScroll: number;
  photoIndex: number;
  /** URL of the photo the hero has drawn, once it has. */
  photoUri: string | null;
  scrollY: SharedValue<number> | null;
};

/** Surfaces a horse photo can fly from. */
export type HeroSurface = 'stables' | 'home';

export function heroSourceKey(surface: HeroSurface, horseId: string): string {
  return `${surface}:${horseId}`;
}
