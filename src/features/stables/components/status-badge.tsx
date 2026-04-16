import type { HorseStatus } from '@/features/stables/types';
import { Text, View } from '@/components/ui';

const STATUS_CONFIG: Record<
  HorseStatus,
  { label: string; bg: string; text: string }
> = {
  IN_TRAINING: {
    label: 'In Training',
    bg: 'bg-success-100',
    text: 'text-success-700',
  },
  REHAB: {
    label: 'Rehab',
    bg: 'bg-warning-100',
    text: 'text-warning-700',
  },
  RETIRED: {
    label: 'Retired',
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
  },
  PRE_TRAINING: {
    label: 'Pre-Training',
    bg: 'bg-primary-100',
    text: 'text-primary-700',
  },
  SOLD: {
    label: 'Sold',
    bg: 'bg-charcoal-100',
    text: 'text-charcoal-700',
  },
};

type StatusBadgeProps = {
  status: HorseStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${config.bg}`}>
      <Text className={`text-xs font-medium ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}
