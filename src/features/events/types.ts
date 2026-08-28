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
};

export type EventsResult = {
  ok: boolean;
  configured: boolean;
  events: ClubEvent[];
};
