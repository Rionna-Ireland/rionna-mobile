import colors from '@/components/ui/colors';

import { eventDayColour, eventKind, eventStripColourway, hasEventCategory } from './event-type';

describe('event type styling', () => {
  it('falls back to lilac-strong days and navy strips without a type', () => {
    expect(eventDayColour({})).toBe(colors.onPrimaryContainer);
    expect(eventStripColourway({ type: null })).toBe('navy');
    expect(eventKind({})).toBeNull();
    expect(hasEventCategory({})).toBe(false);
  });
  it('prefers eventType over the label', () => {
    expect(eventStripColourway({ eventType: 'RACE_DAY', type: 'Whatever' })).toBe('plum');
    expect(eventStripColourway({ eventType: 'STABLE_VISIT', type: 'Race Day' })).toBe('green');
    expect(eventDayColour({ eventType: 'STABLE_VISIT' })).toBe(colors.sage);
    expect(eventDayColour({ eventType: 'SOCIAL' })).toBe(colors.secondaryContainer);
    expect(eventKind({ eventType: 'QA' })).toBe('other');
  });
  it('treats OTHER as the default styling and not a category', () => {
    expect(eventKind({ eventType: 'OTHER', type: 'Other' })).toBeNull();
    expect(eventDayColour({ eventType: 'OTHER', type: 'Other' })).toBe(colors.onPrimaryContainer);
    expect(hasEventCategory({ eventType: 'OTHER', type: 'Other' })).toBe(false);
    expect(hasEventCategory({ eventType: 'SOCIAL', type: 'Social' })).toBe(true);
  });
  it('falls back to the label when eventType is absent', () => {
    expect(eventStripColourway({ type: 'Race Day' })).toBe('plum');
    expect(eventStripColourway({ type: 'Stable Visit' })).toBe('green');
    expect(eventStripColourway({ type: 'Brunch' })).toBe('navy');
    expect(eventDayColour({ type: 'Brunch' })).toBe(colors.secondaryContainer);
    expect(eventDayColour({ type: 'race_day' })).toBe(colors.onPrimaryContainer);
  });
});
