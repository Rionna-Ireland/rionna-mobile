import type { HorseWellbeingType, WellbeingUpdate } from '@/features/stables/types';

import { Text, View } from '@/components/ui';
import { relativeTime } from '@/features/pulse/components/relative-time';

type WellbeingTimelineProps = {
  updates: WellbeingUpdate[] | undefined;
};

const TYPE_LABELS: Record<HorseWellbeingType, string> = {
  VET: 'Vet',
  TRAINING: 'Training',
  REHAB: 'Rehab',
  REST: 'Rest',
};

function TypeChip({ type }: { type: HorseWellbeingType }) {
  return (
    <View className="self-start rounded-full bg-muted px-3 py-1">
      <Text className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
        {TYPE_LABELS[type] ?? type}
      </Text>
    </View>
  );
}

function WellbeingRow({ update }: { update: WellbeingUpdate }) {
  return (
    <View className="gap-2 border-b border-muted py-4 last:border-b-0 last:pb-0">
      <View className="flex-row items-center justify-between">
        <TypeChip type={update.type} />
        <Text className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {update.publishedAt ? relativeTime(update.publishedAt) : ''}
        </Text>
      </View>
      <Text className="font-sans text-sm/relaxed text-charcoal-800">
        {update.body}
      </Text>
    </View>
  );
}

/**
 * Type-labelled wellbeing timeline (vet/training/rehab/rest). The hook
 * feeding this only ever returns published entries, but the guard here
 * keeps the component itself safe if that ever changes upstream. Renders
 * nothing when there are no published updates.
 */
export function WellbeingTimeline({ updates }: WellbeingTimelineProps) {
  const published = (updates ?? []).filter(update => update.publishedAt != null);

  if (published.length === 0) {
    return null;
  }

  return (
    <View className="rounded-2xl bg-card p-6">
      <Text className="mb-4 font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        Wellbeing Timeline
      </Text>
      <View>
        {published.map(update => (
          <WellbeingRow key={update.id} update={update} />
        ))}
      </View>
    </View>
  );
}
