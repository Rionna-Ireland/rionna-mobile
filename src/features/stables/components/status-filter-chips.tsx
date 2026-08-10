import type { StatusFilter } from '@/features/stables/lib/filter-horses';
import { Pressable, ScrollView, Text } from '@/components/ui';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'IN_TRAINING', label: 'In training' },
  { value: 'DECLARED', label: 'Declared' },
  { value: 'PRE_TRAINING', label: 'Pre-training' },
  { value: 'RETIRED', label: 'Retired' },
];

type StatusFilterChipsProps = {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
};

/**
 * "Declared" isn't a horse.status value today (it's an entry-level status —
 * see S8-01 §4 open question); the chip renders and filters to an empty
 * list until that's resolved rather than being hidden or crashing (see
 * filterHorsesByStatus in ../lib/filter-horses).
 */
export function StatusFilterChips({ value, onChange }: StatusFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      className="mb-4"
    >
      {FILTERS.map((filter) => {
        const isActive = filter.value === value;
        return (
          <Pressable
            key={filter.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(filter.value)}
            className={`rounded-full px-3.5 py-2 ${isActive ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text
              className={`font-mono text-[10px] font-bold tracking-widest uppercase ${
                isActive ? 'text-on-primary' : 'text-muted-foreground'
              }`}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
