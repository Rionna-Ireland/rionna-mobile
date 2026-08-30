import type { ClubEvent } from '@/features/events/types';

import * as React from 'react';

import { Image, Pressable, Text, View } from '@/components/ui';
import {
  formatEventDate,
  formatEventLocation,
} from '@/features/events/lib/format-event-date';

type EventCardProps = {
  event: ClubEvent;
  onPress: () => void;
};

export function EventCard({ event, onPress }: EventCardProps) {
  const date = formatEventDate(event.startsAt);

  return (
    <Pressable
      testID={`event-card-${event.id}`}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-neutral-300 bg-white"
    >
      {event.coverImageUrl
        ? (
            <Image
              testID="event-card-cover"
              source={{ uri: event.coverImageUrl }}
              className="h-40 w-full bg-neutral-200"
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={event.title}
            />
          )
        : (
            <View
              testID="event-card-placeholder"
              className="h-24 w-full items-start justify-end bg-[#391d3a] px-4 pb-3"
            >
              <Text className="font-mono text-xs tracking-widest text-[#fcf9f2] uppercase">
                Rionna event
              </Text>
            </View>
          )}
      <View className="gap-1 px-4 py-3">
        {date
          ? (
              <Text className="font-mono text-xs tracking-wider text-violet-700 uppercase">
                {date}
              </Text>
            )
          : null}
        <Text className="font-sans text-lg font-semibold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="font-sans text-sm text-ink-variant" numberOfLines={1}>
          {formatEventLocation(event)}
        </Text>
        {event.rsvp.going
          ? (
              <Text className="mt-1 self-start rounded-full bg-emerald-100 px-3 py-1 font-sans text-xs font-semibold text-emerald-800">
                Going ✓
              </Text>
            )
          : event.rsvp.full
            ? (
                <Text className="mt-1 self-start rounded-full bg-neutral-200 px-3 py-1 font-sans text-xs font-semibold text-neutral-600">
                  Full
                </Text>
              )
            : null}
      </View>
    </Pressable>
  );
}
