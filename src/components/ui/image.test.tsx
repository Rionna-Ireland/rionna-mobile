import * as React from 'react';

import { durations } from '@/lib/motion';

import { act, cleanup, render, screen } from '@/lib/test-utils';

import colors from './colors';
import { Image, IMAGE_PLACEHOLDER, solidBlurhash } from './image';

afterEach(cleanup);

describe('image fallback', () => {
  it('renders the pattern fallback when the source is missing', () => {
    render(<Image testID="img" source={null} fallback={{ colourway: 'navy', initials: 'AR' }} />);
    expect(screen.getByTestId('img-initials')).toHaveTextContent('AR');
  });

  it('switches to the fallback when the image fails to load', () => {
    const onError = jest.fn();
    render(<Image testID="img" source={{ uri: 'https://example.com/x.jpg' }} onError={onError} fallback={{ colourway: 'cream' }} />);
    act(() => {
      screen.getByTestId('img').props.onError({ nativeEvent: { error: 'boom' } });
    });
    expect(onError).toHaveBeenCalled();
    expect(screen.getByTestId('img', { includeHiddenElements: true }).props.className).toContain('bg-secondary-container');
  });

  it('keeps the plain image without a fallback', () => {
    render(<Image testID="img" source={{ uri: 'https://example.com/x.jpg' }} />);
    expect(screen.getByTestId('img')).toBeOnTheScreen();
  });
});

describe('image loading (A-009)', () => {
  it('fades in over the base duration with a cream placeholder', () => {
    render(<Image testID="img" source={{ uri: 'https://example.com/x.jpg' }} />);
    const img = screen.getByTestId('img');
    expect(img.props.transition).toEqual({ duration: durations.base });
    // expo-image resolves `{ blurhash }` to a `blurhash:/…` source.
    expect(img.props.placeholder[0].uri).toBe(`blurhash:/${encodeURI(IMAGE_PLACEHOLDER.blurhash)}`);
  });

  it('lets hero sources opt out with transition={0}', () => {
    render(<Image testID="img" source={{ uri: 'https://example.com/x.jpg' }} transition={0} />);
    expect(screen.getByTestId('img').props.transition).toEqual({ duration: 0 });
  });

  it('encodes a flat single-colour blurhash of the token', () => {
    const hash = solidBlurhash(colors.secondaryContainer);
    expect(hash).toHaveLength(6);
    const B83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';
    const dc = [...hash.slice(2)].reduce((acc, ch) => acc * 83 + B83.indexOf(ch), 0);
    expect(`#${dc.toString(16).padStart(6, '0')}`).toBe(colors.secondaryContainer);
    expect(hash.slice(0, 2)).toBe('00');
  });
});
