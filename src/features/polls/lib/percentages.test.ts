import type { PollOption, PollResults } from '@/features/polls/types';

import { percentagesFor } from '@/features/polls/lib/percentages';

function options(count: number): PollOption[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `o${index + 1}`,
    label: `Option ${index + 1}`,
    sortOrder: index,
  }));
}

const results = (total: number, byOption: Record<string, number>): PollResults => ({ total, byOption });

describe('percentagesFor', () => {
  it('uses stable largest-remainder allocation for equal thirds', () => {
    expect(percentagesFor(options(3), results(3, { o1: 1, o2: 1, o3: 1 }))).toEqual({ o1: 34, o2: 33, o3: 33 });
  });

  it('rounds uneven vote counts while preserving the total', () => {
    expect(percentagesFor(options(2), results(3, { o1: 2, o2: 1 }))).toEqual({ o1: 67, o2: 33 });
  });

  it('always sums repeated fractional results to 100', () => {
    const percentages = percentagesFor(options(6), results(6, {
      o1: 1,
      o2: 1,
      o3: 1,
      o4: 1,
      o5: 1,
      o6: 1,
    }));
    expect(Object.values(percentages).reduce((sum, percent) => sum + percent, 0)).toBe(100);
  });

  it('returns 100 for a single voted option', () => {
    expect(percentagesFor(options(1), results(1, { o1: 1 }))).toEqual({ o1: 100 });
  });

  it('returns zeros when there are no votes', () => {
    expect(percentagesFor(options(2), results(0, {}))).toEqual({ o1: 0, o2: 0 });
  });

  it('treats a missing option count as zero', () => {
    expect(percentagesFor(options(2), results(1, { o1: 1 }))).toEqual({ o1: 100, o2: 0 });
  });
});
