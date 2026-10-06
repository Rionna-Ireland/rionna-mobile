import type { EventsResult } from '@/features/events/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Card, MonoLabel, NumberRoll, Text } from '@/components/ui';
import { formatEventDate } from '@/features/events/lib/format-event-date';
import { slotsRemaining } from '@/features/home/lib/card-helpers';
import { translate } from '@/lib/i18n';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';

/** S13-03 §8: the next upcoming event. Hidden when there is none. */
export function UpcomingEventCard({ data, entranceIndex }: { data: EventsResult | undefined; entranceIndex: number }) {
  const router = useRouter();
  const event = data?.events[0];
  // Fades up the first time it has something to show (S14-02 §6).
  const entering = useFirstLoadEntrance(Boolean(event))(entranceIndex);
  if (!event)
    return null;

  const slots = slotsRemaining(event.rsvp);
  const date = formatEventDate(event.startsAt) ?? translate('home.upcoming.dateTbc');

  return (
    <EntranceItem entering={entering}>
      <Card
        testID="home-event"
        className="gap-8"
        onPress={() => router.push({ pathname: '/event/[event-id]', params: { 'event-id': event.id } })}
      >
        <MonoLabel>{translate('home.upcoming.kicker')}</MonoLabel>
        <View className="gap-1.5">
          {slots ? <NumberRoll variant="body-sm" className="text-on-primary-container" value={slots} /> : null}
          <Text variant="body-lg" numberOfLines={2}>{event.title}</Text>
          <Text variant="body-sm" className="text-ink-variant">{date}</Text>
        </View>
      </Card>
    </EntranceItem>
  );
}
