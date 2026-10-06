import { cardA11yActions, cardA11yLabel } from './a11y-card';

describe('cardA11yLabel', () => {
  it('joins the non-blank parts with commas', () => {
    expect(cardA11yLabel(['Laska', null, '', false, 'In Training', undefined, 'following'])).toBe('Laska, In Training, following');
  });
});

describe('cardA11yActions', () => {
  it('returns no props when every action is absent or disabled', () => {
    expect(cardA11yActions([null, false, { name: 'x', label: 'X', onActivate: jest.fn(), disabled: true }])).toEqual({});
  });

  it('exposes enabled actions and routes each to its handler', () => {
    const follow = jest.fn();
    const remind = jest.fn();
    const props = cardA11yActions([
      { name: 'follow', label: 'Follow horse', onActivate: follow },
      undefined,
      { name: 'remind', label: 'Remind me', onActivate: remind },
    ]);
    expect(props.accessibilityActions).toEqual([
      { name: 'follow', label: 'Follow horse' },
      { name: 'remind', label: 'Remind me' },
    ]);
    props.onAccessibilityAction?.({ nativeEvent: { actionName: 'remind' } } as never);
    expect(remind).toHaveBeenCalledTimes(1);
    expect(follow).not.toHaveBeenCalled();
  });
});
