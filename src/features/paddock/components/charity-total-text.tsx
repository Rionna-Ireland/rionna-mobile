import type { CharityCounter } from '@/features/paddock/lib/use-charity-counter';

import { CountUp, Text } from '@/components/ui';
import { wholeEuros } from '@/features/paddock/lib/charity-counter';
import { formatEuro } from '@/features/paddock/lib/format-euro';

type Props = {
  counter: CharityCounter;
  totalCents: number;
  /** Text colour, as a token value (CountUp's cells can't take a class) and a class for the static total. */
  color: string;
  className: string;
  /** Home: shrink a long static total to one line, as before S14-06. */
  fit?: boolean;
  testID?: string;
};

/**
 * The charity total in `display-xl`: a `CountUp` when this surface counts
 * (first view or an increase), otherwise the plain static total, exactly as
 * S13 drew it. The mode is fixed for the mount, so it never swaps mid-view.
 */
export function CharityTotalText({ counter, totalCents, color, className, fit = false, testID }: Props) {
  if (!counter.plan.animate) {
    return (
      <Text variant="display-xl" className={className} numberOfLines={fit ? 1 : undefined} adjustsFontSizeToFit={fit} testID={testID}>
        {formatEuro(totalCents)}
      </Text>
    );
  }
  return (
    <CountUp
      value={counter.count}
      from={counter.plan.from}
      target={wholeEuros(totalCents)}
      color={color}
      testID={testID}
    />
  );
}
