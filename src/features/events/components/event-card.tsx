import type { TileSpec } from '@/components/brand/pattern/tile-data';
import type { ClubEvent } from '@/features/events/types';

import * as React from 'react';

import { PatternFill } from '@/components/brand/pattern';
import { Button, Card, Pressable, Text, View } from '@/components/ui';
import { cardA11yActions, cardA11yLabel } from '@/components/ui/a11y-card';
import { rsvpButtonState } from '@/features/events/lib/calendar-grid';
import { eventStripColourway } from '@/features/events/lib/event-type';
import { formatEventDateLine } from '@/features/events/lib/format-event-date';
import { translate } from '@/lib/i18n';
import { haptics } from '@/lib/motion';

// Hoisted so PatternFill (memoised) sees stable spec/style references.
const STRIP_STYLE = { flex: 1 } as const;
const STRIP_WIDTH_STYLE = { width: 36 } as const;
const PAST_SPEC: TileSpec = { kind: 'harlequin', colourway: 'cream', turn: 0 };
const stripSpecCache = new Map<string, TileSpec>();
function stripSpec(colourway: ReturnType<typeof eventStripColourway>): TileSpec {
  let spec = stripSpecCache.get(colourway);
  if (!spec) {
    spec = { kind: 'harlequin', colourway, turn: 0 };
    stripSpecCache.set(colourway, spec);
  }
  return spec;
}

export type EventCardProps = {
  event: ClubEvent;
  onPress: () => void;
  onToggleRsvp?: (going: boolean) => void;
  rsvpPending?: boolean;
  reminderOn?: boolean;
  onToggleReminder?: () => void;
  /** Past events: muted, no buttons. */
  past?: boolean;
};

type CardActionsInput = Pick<EventCardProps, 'onToggleRsvp' | 'rsvpPending' | 'reminderOn' | 'onToggleReminder'> & {
  state: ReturnType<typeof rsvpButtonState>;
};

/**
 * RSVP and Remind as VoiceOver custom actions (A-004): the card is one
 * element on iOS, which hides the nested buttons. Same haptics as the buttons.
 */
function eventCardActions({ state, onToggleRsvp, rsvpPending, reminderOn, onToggleReminder }: CardActionsInput) {
  const going = state === 'going';
  return cardA11yActions([
    onToggleRsvp && {
      name: 'rsvp',
      label: translate(going ? 'events.detail.cancelRsvp' : 'events.rsvp'),
      disabled: state === 'full' || rsvpPending,
      onActivate: () => {
        if (!going)
          haptics.success();
        onToggleRsvp(!going);
      },
    },
    onToggleReminder && {
      name: 'remind',
      label: translate(reminderOn ? 'events.reminderOffA11y' : 'events.remindMe'),
      onActivate: () => {
        if (!reminderOn)
          haptics.success();
        onToggleReminder();
      },
    },
  ]);
}

export function EventCard({
  event,
  onPress,
  onToggleRsvp,
  rsvpPending = false,
  reminderOn = false,
  onToggleReminder,
  past = false,
}: EventCardProps) {
  const dateLine = formatEventDateLine(event.startsAt);
  const meta = [dateLine, event.type?.toLowerCase()].filter(Boolean).join(' · ');
  const state = rsvpButtonState(event);
  const interactive = !past && state !== 'hidden';
  const label = cardA11yLabel([
    event.title,
    meta,
    past && translate('events.pastA11y'),
    state === 'going' && translate('events.goingA11y'),
    state === 'full' && translate('events.full'),
    event.rsvp.count > 0 && translate('events.detail.attendingValue', { count: event.rsvp.count }),
    reminderOn && translate('events.reminding'),
  ]);

  return (
    <Card noPadding testID={`event-card-${event.id}`} className={past ? 'opacity-60' : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        {...(interactive ? eventCardActions({ state, onToggleRsvp, rsvpPending, reminderOn, onToggleReminder }) : {})}
        onPress={onPress}
        className="flex-row"
      >
        <View testID={`event-card-${event.id}-strip`} style={STRIP_WIDTH_STYLE}>
          <PatternFill
            spec={past ? PAST_SPEC : stripSpec(eventStripColourway(event.type))}
            tileSize={36}
            style={STRIP_STYLE}
          />
        </View>
        <View className="flex-1 gap-2 p-4">
          {meta ? <Text variant="body-sm" className="text-ink-variant">{meta}</Text> : null}
          <Text variant="display-sm" numberOfLines={3}>{event.title}</Text>
          {interactive
            ? (
                <View className="mt-3 flex-row gap-2">
                  <Button
                    testID={`event-card-${event.id}-rsvp`}
                    size="md"
                    fullWidth={false}
                    variant="primary"
                    label={
                      state === 'going'
                        ? translate('events.going')
                        : state === 'full' ? translate('events.full') : translate('events.rsvp')
                    }
                    disabled={state === 'full' || rsvpPending}
                    haptic={state === 'going' ? false : 'success'}
                    onPress={() => onToggleRsvp?.(state !== 'going')}
                  />
                  <Button
                    testID={`event-card-${event.id}-remind`}
                    size="md"
                    fullWidth={false}
                    variant="secondary"
                    label={reminderOn ? translate('events.reminding') : translate('events.remindMe')}
                    accessibilityState={{ selected: reminderOn }}
                    haptic={reminderOn ? false : 'success'}
                    onPress={onToggleReminder}
                  />
                </View>
              )
            : null}
        </View>
      </Pressable>
    </Card>
  );
}
