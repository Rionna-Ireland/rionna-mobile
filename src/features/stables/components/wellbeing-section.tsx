import type { WellbeingRow } from '@/features/stables/lib/horse-facts';
import type { HorseUpdate } from '@/features/stables/types';

import * as React from 'react';
import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { Card, colors, MonoLabel, MotionPressable, Text } from '@/components/ui';
import { CaretRightV2 } from '@/components/ui/icons/v2';
import { formatShortDate } from '@/features/stables/lib/horse-facts';
import { tx } from '@/features/stables/lib/tx';
import { translate } from '@/lib/i18n';

type WellbeingSectionProps = {
  /** Structured vet check / training load rows, shown above the updates. */
  rows?: WellbeingRow[];
  updates: HorseUpdate[];
  onOpenUpdate: (update: HorseUpdate) => void;
};

/**
 * Sage "Wellbeing" card (S13-04 detail §6). In S13 it lists the latest
 * `wellbeing` horse updates: title, date (mono, right) and a chevron to the
 * update. The structured "Vet check" / "Training load" rows sit above them
 * (S13-10). Hidden by the caller when there is nothing to show.
 */
export function WellbeingSection({ rows = [], updates, onOpenUpdate }: WellbeingSectionProps) {
  if (updates.length === 0 && rows.length === 0)
    return null;
  return (
    <Card testID="wellbeing-section" variant="sage" className="gap-2 border border-outline-variant">
      <MonoLabel className="text-ink">{translate('stables.detail.wellbeingLabel')}</MonoLabel>
      <View>
        {rows.map((row, i) => (
          <View
            key={row.key}
            testID={`wellbeing-fact-${row.key}`}
            className={twMerge(
              'min-h-11 flex-row items-center gap-3 py-2.5',
              (i < rows.length - 1 || updates.length > 0) && 'border-b border-forest/20',
            )}
          >
            <Text variant="body-lg" className="flex-1" numberOfLines={2}>{row.label}</Text>
            {row.date ? <MonoLabel className="text-forest">{row.date}</MonoLabel> : null}
          </View>
        ))}
        {updates.map((update, i) => (
          <MotionPressable
            size="flat"
            pressedOpacity={0.85}
            key={update.id}
            testID={`wellbeing-row-${update.id}`}
            onPress={() => onOpenUpdate(update)}
            accessibilityRole="button"
            accessibilityLabel={tx('stables.detail.wellbeingRowA11y', { title: update.title })}
            className={twMerge(
              'min-h-11 flex-row items-center gap-3 py-2.5',
              i < updates.length - 1 && 'border-b border-forest/20',
            )}
          >
            <Text variant="body-lg" className="flex-1" numberOfLines={2}>{update.title}</Text>
            <MonoLabel className="text-forest">{formatShortDate(update.publishedAt)}</MonoLabel>
            <CaretRightV2 size={18} color={colors.ink} />
          </MotionPressable>
        ))}
      </View>
    </Card>
  );
}
