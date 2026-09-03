import { formatEuro } from '@/features/paddock/lib/format-euro';

describe('formatEuro', () => {
  it('formats whole euros with thousands separators', () => {
    expect(formatEuro(2_450_000)).toBe('€24,500');
    expect(formatEuro(123_456_789)).toBe('€1,234,567');
  });
  it('floors cents and handles zero', () => {
    expect(formatEuro(99)).toBe('€0');
    expect(formatEuro(0)).toBe('€0');
  });
});
