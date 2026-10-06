import { render, renderHook, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Text } from 'react-native';

import { isFirstLoad, SkeletonSwap, useContentEntrance } from './skeleton-swap';

type Anim = { initialValues: Record<string, unknown>; animations: Record<string, unknown> };
const run = (fn: unknown) => (fn as () => Anim)();

describe('isFirstLoad (skeleton only without cache)', () => {
  it('is true only while pending with no data AND fetching', () => {
    expect(isFirstLoad({ isPending: true, isFetching: true })).toBe(true);
  });

  it('cached data never shows a skeleton, even mid-refetch', () => {
    expect(isFirstLoad({ isPending: false, isFetching: true })).toBe(false);
    expect(isFirstLoad({ isPending: false, isFetching: false })).toBe(false);
  });

  it('a disabled or offline-paused query shows no endless skeleton', () => {
    expect(isFirstLoad({ isPending: true, isFetching: false })).toBe(false);
  });
});

function Swap({ loading, content = 'content' }: { loading: boolean; content?: string | null }) {
  return (
    <SkeletonSwap loading={loading} skeleton={<Text>skeleton</Text>} testID="swap">
      {content === null ? null : <Text>{content}</Text>}
    </SkeletonSwap>
  );
}

describe('skeletonSwap', () => {
  it('shows the skeleton on first load, then crossfades the content in', () => {
    const { rerender } = render(<Swap loading />);
    expect(screen.getByText('skeleton')).toBeOnTheScreen();
    expect(run(screen.getByTestId('swap').props.exiting).animations).toEqual({ opacity: 0 });

    rerender(<Swap loading={false} />);
    expect(screen.queryByText('skeleton')).toBeNull();
    const content = screen.getByText('content').parent!.parent!;
    expect(run(content.props.entering)).toEqual({ initialValues: { opacity: 0 }, animations: { opacity: 1 } });
  });

  it('cached content mounts straight away with no crossfade', () => {
    render(<Swap loading={false} />);
    expect(screen.queryByText('skeleton')).toBeNull();
    expect(screen.getByText('content').parent!.parent!.props.entering).toBeUndefined();
  });

  it('renders nothing once loaded when there is no content', () => {
    const { rerender } = render(<Swap loading />);
    rerender(<Swap loading={false} content={null} />);
    expect(screen.toJSON()).toBeNull();
  });
});

describe('useContentEntrance', () => {
  it('suppresses the first-load fade-up after a skeleton (the crossfade is the entrance)', () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) => useContentEntrance(!loading, loading),
      { initialProps: { loading: true } },
    );
    rerender({ loading: false });
    expect(result.current(0)).toBeUndefined();
  });

  it('keeps the S14-02 fade-up for cached first renders', () => {
    const { result } = renderHook(() => useContentEntrance(true, false));
    expect(result.current(0)).toBeDefined();
  });
});
