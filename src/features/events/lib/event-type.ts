import type { Colourway } from '@/components/brand/pattern';
import type { ClubEvent } from '@/features/events/types';

import colors from '@/components/ui/colors';

/**
 * Type-driven styling for events (S13-05 / S13-11). The backend sends the raw
 * enum as `eventType` (logic) and the display label as `type` (copy). Logic
 * prefers `eventType`; the label heuristic is only a fallback for payloads
 * without it. OTHER / untyped events keep the default styling.
 */
export type EventKind = 'race-day' | 'stable-visit' | 'other';

export type EventTypeFields = Pick<ClubEvent, 'type' | 'eventType'>;

function kindFromLabel(type: string | null | undefined): EventKind | null {
  if (!type)
    return null;
  const t = type.toLowerCase();
  if (t.includes('race'))
    return 'race-day';
  if (t.includes('stable'))
    return 'stable-visit';
  return 'other';
}

export function eventKind(event: EventTypeFields): EventKind | null {
  switch (event.eventType) {
    case 'RACE_DAY': return 'race-day';
    case 'STABLE_VISIT': return 'stable-visit';
    case 'SOCIAL':
    case 'QA': return 'other';
    case 'OTHER': return null;
    default: return kindFromLabel(event.type);
  }
}

/** True when the event carries a meaningful category (not OTHER / untyped). */
export function hasEventCategory(event: EventTypeFields): boolean {
  if (event.eventType)
    return event.eventType !== 'OTHER';
  return Boolean(event.type) && event.type!.toLowerCase() !== 'other';
}

/** Calendar day fill. Race day + OTHER/untyped are lilac-strong. */
export function eventDayColour(event: EventTypeFields): string {
  switch (eventKind(event)) {
    case 'stable-visit': return colors.sage;
    case 'other': return colors.secondaryContainer;
    default: return colors.onPrimaryContainer;
  }
}

/** Card pattern-strip colourway. OTHER/untyped: navy. */
export function eventStripColourway(event: EventTypeFields): Colourway {
  switch (eventKind(event)) {
    case 'race-day': return 'plum';
    case 'stable-visit': return 'green';
    default: return 'navy';
  }
}
