export const EVENTS_QUERY_ROOT = 'events';

export type EventScope = 'upcoming' | 'past';

export type ClubEventRsvp = {
  going: boolean;
  status: string | null;
  count: number;
  limit: number | null;
  disabled: boolean;
  full: boolean;
};

export type EventTypeValue = 'RACE_DAY' | 'STABLE_VISIT' | 'SOCIAL' | 'QA' | 'OTHER';

export type ClubEvent = {
  id: string;
  spaceId: string | null;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  locationType: string | null;
  inPersonLocation: string | null;
  virtualLocationUrl: string | null;
  coverImageUrl: string | null;
  bodyText: string | null;
  tiptapDoc: Record<string, unknown> | null;
  embeds: Record<string, unknown>;
  inlineAttachments: Record<string, unknown>[];
  url: string | null;
  rsvp: ClubEventRsvp;
  /** Display label of the event category ("Race Day", "Stable Visit", "Q&A", "Other"). */
  type?: string | null;
  /** Raw category enum; drives colour/strip logic. A missing sidecar row arrives as OTHER. */
  eventType?: EventTypeValue | null;
};

export type EventsResult = {
  ok: boolean;
  configured: boolean;
  events: ClubEvent[];
};
