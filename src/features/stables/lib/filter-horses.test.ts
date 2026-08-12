import { filterHorsesByStatus } from '@/features/stables/lib/filter-horses';

type TestHorse = { id: string; status: 'PRE_TRAINING' | 'IN_TRAINING' | 'REHAB' | 'RETIRED' | 'SOLD' };

function horse(id: string, status: TestHorse['status']): TestHorse {
  return { id, status };
}

describe('filterHorsesByStatus', () => {
  const horses = [
    horse('h1', 'IN_TRAINING'),
    horse('h2', 'PRE_TRAINING'),
    horse('h3', 'RETIRED'),
    horse('h4', 'IN_TRAINING'),
  ];

  it('returns every horse for the "All" filter', () => {
    expect(filterHorsesByStatus(horses, 'ALL')).toEqual(horses);
  });

  it('filters to horses matching the selected status', () => {
    expect(filterHorsesByStatus(horses, 'IN_TRAINING')).toEqual([horses[0], horses[3]]);
    expect(filterHorsesByStatus(horses, 'RETIRED')).toEqual([horses[2]]);
  });

  it('filters to an empty list for a status not present in the current data (DECLARED)', () => {
    expect(filterHorsesByStatus(horses, 'DECLARED')).toEqual([]);
  });
});
