import type { Horse } from '@/features/stables/types';

import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView } from 'react-native';

import { Avatar, Card, EmptyState, MonoLabel } from '@/components/ui';
import { EntranceItem, useFirstLoadEntrance } from '@/lib/motion';

function avatarUri(horse: Horse): string | null {
  const url = horse.photos[0]?.url;
  return url ? `${url}?width=120&quality=80` : null;
}

type MyHorsesCardProps = { horses: Horse[] | undefined; isLoading: boolean; entranceIndex: number };

/** S13-03 §5: white card with a row of 41pt followed-horse avatars. */
export function MyHorsesCard({ horses, isLoading, entranceIndex }: MyHorsesCardProps) {
  const router = useRouter();

  // Don't flash the empty state before the first fetch settles.
  const settled = !(!horses && isLoading);
  // Fades up once the first fetch settles (S14-02 §6).
  const entering = useFirstLoadEntrance(settled)(entranceIndex);
  if (!settled)
    return null;

  if (!horses || horses.length === 0) {
    return (
      <EntranceItem entering={entering}>
        <EmptyState
          testID="home-my-horses-empty"
          kicker="My horses"
          title="Follow a horse to see it here"
          actionLabel="Go to Stables"
          onAction={() => router.push('/stables')}
        />
      </EntranceItem>
    );
  }

  return (
    <EntranceItem entering={entering}>
      <Card testID="home-my-horses" className="gap-2.5">
        <MonoLabel>My horses</MonoLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9 }}
        >
          {horses.map(horse => (
            <Pressable
              key={horse.id}
              testID={`home-horse-${horse.id}`}
              accessibilityRole="button"
              accessibilityLabel={horse.name}
              onPress={() => router.push(`/stables/${horse.id}`)}
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
            >
              <Avatar kind="horse" size={41} name={horse.name} uri={avatarUri(horse)} />
            </Pressable>
          ))}
        </ScrollView>
      </Card>
    </EntranceItem>
  );
}
