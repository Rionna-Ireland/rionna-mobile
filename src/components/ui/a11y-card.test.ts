import { a11yCardProps, a11ySummary } from './a11y-card';

describe('a11ySummary', () => {
  it('joins the non-blank parts with commas', () => {
    expect(a11ySummary(['Laska', null, '', '  ', false, 'In Training', undefined, 'following'])).toBe('Laska, In Training, following');
  });

  it('trims each part', () => {
    expect(a11ySummary([' Laska ', 'Stable vote '])).toBe('Laska, Stable vote');
  });
});

describe('a11yCardProps', () => {
  it('is one accessible element with the summary label and no actions when every action is absent or disabled', () => {
    expect(a11yCardProps({
      label: 'Laska',
      actions: [null, false, undefined, { name: 'x', label: 'X', onAction: jest.fn(), disabled: true }],
    })).toEqual({ accessible: true, accessibilityLabel: 'Laska' });
  });

  it('defaults to no actions', () => {
    expect(a11yCardProps({ label: 'Laska' })).toEqual({ accessible: true, accessibilityLabel: 'Laska' });
  });

  it('exposes enabled actions and routes each to its handler', () => {
    const follow = jest.fn();
    const remind = jest.fn();
    const props = a11yCardProps({
      label: 'Laska',
      actions: [
        { name: 'follow', label: 'Follow horse', onAction: follow },
        undefined,
        { name: 'remind', label: 'Remind me', onAction: remind },
      ],
    });
    expect(props.accessible).toBe(true);
    expect(props.accessibilityLabel).toBe('Laska');
    expect(props.accessibilityActions).toEqual([
      { name: 'follow', label: 'Follow horse' },
      { name: 'remind', label: 'Remind me' },
    ]);
    props.onAccessibilityAction?.({ nativeEvent: { actionName: 'remind' } } as never);
    expect(remind).toHaveBeenCalledTimes(1);
    expect(follow).not.toHaveBeenCalled();
  });
});
