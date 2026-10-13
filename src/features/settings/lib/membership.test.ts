import { formatMonthYear, getMembershipLine, getStatusPill } from '@/features/settings/lib/membership';

describe('membership helpers', () => {
  it('formats month and year', () => {
    expect(formatMonthYear('2026-03-12T12:00:00.000Z')).toBe('March 2026');
    expect(formatMonthYear(null)).toBeNull();
    expect(formatMonthYear('garbage')).toBeNull();
  });

  it('builds the membership line', () => {
    expect(getMembershipLine({ since: '2026-03-12T12:00:00.000Z', foundingMember: true })).toBe('Founding member, since March 2026');
    expect(getMembershipLine({ since: '2026-03-12T12:00:00.000Z', foundingMember: false })).toBe('Member since March 2026');
    expect(getMembershipLine({ since: null, foundingMember: true })).toBeNull();
    expect(getMembershipLine(undefined)).toBeNull();
  });

  it('maps every status to a pill', () => {
    expect(getStatusPill('active')).toEqual({ label: 'Active', variant: 'navy' });
    expect(getStatusPill('past_due').label).toBe('Past due');
    expect(getStatusPill('cancelled').label).toBe('Ended');
    expect(getStatusPill('none').label).toBe('Not a member');
  });
});
