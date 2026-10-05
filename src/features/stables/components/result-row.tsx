import type { Entry } from '@/features/stables/types';

import * as React from 'react';
import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { MonoLabel, Text } from '@/components/ui';
import { formatResultLine, formatResultMeta } from '@/features/stables/lib/horse-facts';

type ResultRowProps = {
  entry: Entry;
  divider?: boolean;
};

/**
 * Past result on the navy Racing card (S13-04 detail §4): "Naas, 6f mdn —
 * 3rd⏳ of 11" over mono "21 JUNE · ⏳6/1". Text-only: replays are hidden for
 * v1 (S13-16) even when the admin has set `replayUrl`.
 */
export function ResultRow({ entry, divider = false }: ResultRowProps) {
  return (
    <View
      testID={`result-row-${entry.id}`}
      className={twMerge('min-h-14 justify-center gap-1 py-3', divider && 'border-b border-white/12')}
    >
      <Text variant="body" className="text-white">{formatResultLine(entry)}</Text>
      <MonoLabel tone="white">{formatResultMeta(entry)}</MonoLabel>
    </View>
  );
}
