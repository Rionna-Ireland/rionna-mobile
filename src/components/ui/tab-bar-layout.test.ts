import { TAB_BAR_PADDING_X, TAB_CENTRE_SIZE, TAB_SIZE, tabActiveness, tabIndicatorOffsets } from './tab-bar-layout';

const SLOTS = [TAB_SIZE, TAB_SIZE, TAB_CENTRE_SIZE, TAB_SIZE, TAB_SIZE];

describe('tabIndicatorOffsets', () => {
  it('puts the first circle on the left padding and the last against the right padding', () => {
    const offsets = tabIndicatorOffsets(350, SLOTS);
    expect(offsets).toHaveLength(5);
    expect(offsets[0]).toBeCloseTo(TAB_BAR_PADDING_X);
    // Last slot ends at the inner right edge: 350 - 2×border - padding.
    expect(offsets[4] + TAB_SIZE).toBeCloseTo(350 - 2 - TAB_BAR_PADDING_X);
  });

  it('centres the 44pt circle on the 52pt Community slot', () => {
    const offsets = tabIndicatorOffsets(350, SLOTS);
    const inner = 350 - 2 - TAB_BAR_PADDING_X * 2;
    const gap = (inner - (4 * TAB_SIZE + TAB_CENTRE_SIZE)) / 4;
    const centreSlotLeft = TAB_BAR_PADDING_X + 2 * (TAB_SIZE + gap);
    expect(offsets[2]).toBeCloseTo(centreSlotLeft + (TAB_CENTRE_SIZE - TAB_SIZE) / 2);
    // Symmetric about the pill's centre line.
    expect(offsets[2] + TAB_SIZE / 2).toBeCloseTo((350 - 2) / 2);
  });

  it('keeps offsets increasing on a narrower pill', () => {
    const offsets = tabIndicatorOffsets(320, SLOTS);
    for (let i = 1; i < offsets.length; i++)
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
  });
});

describe('tabActiveness', () => {
  it('is 1 when the circle is centred on the tab and 0 a slot away', () => {
    expect(tabActiveness(100, 100, 60)).toBe(1);
    expect(tabActiveness(160, 100, 60)).toBe(0);
    expect(tabActiveness(40, 100, 60)).toBe(0);
    expect(tabActiveness(400, 100, 60)).toBe(0);
  });

  it('cross-fades linearly in between', () => {
    expect(tabActiveness(130, 100, 60)).toBeCloseTo(0.5);
  });
});
