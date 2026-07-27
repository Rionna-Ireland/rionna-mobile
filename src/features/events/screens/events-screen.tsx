import * as React from 'react';

import {
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';

const CATEGORIES = [
  'All',
  'Race days',
  'Stable visits',
  'Brunches',
  'Charity',
  'Networking',
] as const;

export function EventsScreen() {
  const contentPaddingBottom = useTabBarContentPadding(24);
  const contentPaddingTop = useScreenTopPadding();
  const [selected, setSelected] = React.useState<string>('All');

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        }}
      >
        <Text className="font-mono text-[10px] tracking-widest text-violet-700 uppercase">
          Race days & socials
        </Text>
        <Text className="mt-2 font-sans text-3xl font-semibold text-ink">Events</Text>

        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          className="mt-6"
          contentContainerStyle={{ gap: 8 }}
        >
          {CATEGORIES.map(category => (
            <Text
              key={category}
              accessibilityRole="button"
              onPress={() => setSelected(category)}
              className={`rounded-full border px-4 py-2 font-sans text-sm ${
                selected === category
                  ? 'border-[#391d3a] bg-[#391d3a] font-semibold text-[#fcf9f2]'
                  : 'border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              {category}
            </Text>
          ))}
        </ScrollView>

        <View testID="events-empty" className="mt-6 rounded-2xl border border-neutral-300 bg-white p-6">
          <Text className="font-sans text-lg font-semibold text-ink">Events are on the way</Text>
          <Text className="mt-2 font-sans text-sm/5 text-neutral-600">
            Race days, stable visits, brunches and charity events will appear here with RSVP once
            announced.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
