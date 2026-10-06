import { relativeTime } from './relative-time';

const NOW = new Date(2026, 9, 6, 12, 0);

describe('relativeTime', () => {
  it('reads recent times relatively', () => {
    expect(relativeTime(new Date(2026, 9, 6, 11, 59, 30).toISOString(), NOW)).toBe('Just now');
    expect(relativeTime(new Date(2026, 9, 6, 11, 45).toISOString(), NOW)).toBe('15 min ago');
    expect(relativeTime(new Date(2026, 9, 6, 9, 0).toISOString(), NOW)).toBe('3 hours ago');
    expect(relativeTime(new Date(2026, 9, 5, 11, 0).toISOString(), NOW)).toBe('Yesterday');
    expect(relativeTime(new Date(2026, 9, 2, 12, 0).toISOString(), NOW)).toBe('4 days ago');
  });

  it('shows older dates as "20 Sep", adding the year only for other years (A-028)', () => {
    expect(relativeTime(new Date(2026, 8, 20, 12, 0).toISOString(), NOW)).toBe('20 Sep');
    expect(relativeTime(new Date(2025, 8, 20, 12, 0).toISOString(), NOW)).toBe('20 Sep 2025');
  });
});
