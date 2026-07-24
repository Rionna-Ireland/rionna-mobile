import * as React from 'react';

import {
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { useTabBarContentPadding } from '@/components/ui/tab-bar-layout';

type HubRow = { title: string; subtitle: string; future?: boolean };

// Merchandise, Partner offers and Competitions are phase 2 (client call
// 2026-07-24) — reintroduce them here when that phase is agreed.
const ROWS: HubRow[] = [
  { title: 'My Rionna journey', subtitle: 'Member, attendance and charity champion badges' },
  { title: 'Member benefits', subtitle: 'Restaurant, hotel and lifestyle partners' },
  { title: 'Charity impact', subtitle: 'Total donated, voting and impact stories' },
];

function PaddockRow({ row }: { row: HubRow }) {
  return (
    <View
      testID={`paddock-row-${row.title}`}
      className={`rounded-2xl bg-white p-5 ${
        row.future ? 'border border-dashed border-neutral-400' : 'border border-neutral-300'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-base font-semibold text-ink">{row.title}</Text>
        <Text className="rounded-full bg-neutral-100 px-3 py-1 font-mono text-[10px] tracking-wider text-neutral-600 uppercase">
          {row.future ? 'Future' : 'Coming soon'}
        </Text>
      </View>
      <Text className="mt-1 font-sans text-sm/5 text-neutral-600">{row.subtitle}</Text>
    </View>
  );
}

export function PaddockScreen() {
  const contentPaddingBottom = useTabBarContentPadding(24);
  const contentPaddingTop = useScreenTopPadding();

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
          Rewards & benefits
        </Text>
        <Text className="mt-2 font-sans text-3xl font-semibold text-ink">The Paddock</Text>
        <View className="mt-6 gap-4">
          {ROWS.map(row => (
            <PaddockRow key={row.title} row={row} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}
