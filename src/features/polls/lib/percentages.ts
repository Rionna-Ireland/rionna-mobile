import type { PollOption, PollResults } from '@/features/polls/types';

/** Integer percentages that sum to exactly 100, or 0 when there are no votes. */
export function percentagesFor(options: PollOption[], results: PollResults): Record<string, number> {
  const percentages: Record<string, number> = {};
  for (const option of options) percentages[option.id] = 0;

  const countedTotal = options.reduce((sum, option) => sum + (results.byOption[option.id] ?? 0), 0);
  if (results.total === 0 || countedTotal === 0) {
    return percentages;
  }

  const exact = options.map(option => ((results.byOption[option.id] ?? 0) / countedTotal) * 100);
  const floors = exact.map(Math.floor);
  let remainder = 100 - floors.reduce((sum, percent) => sum + percent, 0);
  const allocationOrder = exact
    .map((percent, index) => ({ index, fractional: percent - floors[index] }))
    .sort((left, right) => right.fractional - left.fractional || left.index - right.index);

  for (const { index } of allocationOrder) {
    if (remainder <= 0)
      break;
    floors[index] += 1;
    remainder -= 1;
  }

  options.forEach((option, index) => {
    percentages[option.id] = floors[index];
  });
  return percentages;
}
