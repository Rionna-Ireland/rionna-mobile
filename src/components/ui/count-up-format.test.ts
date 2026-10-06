import { countUpSlots, formatEuroWhole, groupWhole, slotChar } from './count-up-format';

const enIE = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

describe('count-up format', () => {
  it.each([0, 7, 42, 999, 1000, 24_500, 123_456, 1_000_000, 98_765_432])('matches en-IE EUR for %d', (n) => {
    expect(formatEuroWhole(n)).toBe(enIE.format(n));
  });

  it('rounds mid-count values and never goes negative', () => {
    expect(groupWhole(1234.6)).toBe('1,235');
    expect(groupWhole(-5)).toBe('0');
  });

  it('reads slots from the right so commas line up while counting', () => {
    expect(slotChar('24,500', 0)).toBe('0');
    expect(slotChar('24,500', 3)).toBe(',');
    expect(slotChar('24,500', 5)).toBe('2');
    expect(slotChar('4,500', 5)).toBe('');
    expect(slotChar('500', 3)).toBe('');
  });

  it('lays out one slot per target character', () => {
    expect(countUpSlots(24_500)).toEqual([
      { k: 5, kind: 'digit' },
      { k: 4, kind: 'digit' },
      { k: 3, kind: 'comma' },
      { k: 2, kind: 'digit' },
      { k: 1, kind: 'digit' },
      { k: 0, kind: 'digit' },
    ]);
    expect(countUpSlots(0)).toEqual([{ k: 0, kind: 'digit' }]);
  });
});
