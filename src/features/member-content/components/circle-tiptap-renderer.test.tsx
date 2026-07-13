import { fireEvent, render, screen } from '@testing-library/react-native';

import * as React from 'react';

import {
  EMBED_TIPTAP_BODY,
  IMAGE_TIPTAP_BODY,
  RICH_TEXT_TIPTAP_BODY,
  UNSUPPORTED_TIPTAP_BODY,
} from '../tiptap/__fixtures__/corpus';
import { circleNodeTypes } from '../tiptap/blocks';
import { hydrateCircleDoc } from '../tiptap/hydrate';
import { CIRCLE_NATIVE_NODE_SUPPORT } from '../tiptap/native-support';
import { CircleTiptapRenderer } from './circle-tiptap-renderer';

jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, props),
  };
});

describe('circleTiptapRenderer', () => {
  it('renders rich structural content and opens a safe marked link', () => {
    const onOpenUrl = jest.fn();
    render(
      <CircleTiptapRenderer
        doc={hydrateCircleDoc(RICH_TEXT_TIPTAP_BODY)}
        onOpenUrl={onOpenUrl}
      />,
    );

    expect(screen.getByText('Racecourse update')).toBeOnTheScreen();
    expect(screen.getByText('Travel early.')).toBeOnTheScreen();
    expect(screen.getByText('3.')).toBeOnTheScreen();
    expect(screen.getByText('4.')).toBeOnTheScreen();
    expect(screen.getByText('•')).toBeOnTheScreen();
    expect(screen.getByText('STALL 12')).toBeOnTheScreen();
    expect(screen.getByTestId('circle-horizontal-rule')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('race card'));
    expect(onOpenUrl).toHaveBeenCalledWith('https://rionna.example/race-card');
  });

  it('renders a resolved image with explicit disk caching and Circle layout intent', () => {
    render(
      <CircleTiptapRenderer doc={hydrateCircleDoc(IMAGE_TIPTAP_BODY)} />,
    );

    const image = screen.getByTestId('circle-image-content');
    expect(image.props.source).toEqual([{
      uri: 'https://media.example/parade-ring.jpg',
    }]);
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.accessibilityLabel).toBe('Horse walking in the parade ring');
    expect(screen.getByTestId('circle-image').props.style).toEqual(
      expect.objectContaining({ alignSelf: 'flex-end', width: '50%' }),
    );
  });

  it('isolates resolved embed HTML and hands safe top-frame navigation to native code', () => {
    const onOpenUrl = jest.fn();
    render(
      <CircleTiptapRenderer
        doc={hydrateCircleDoc(EMBED_TIPTAP_BODY)}
        onOpenUrl={onOpenUrl}
      />,
    );

    const webView = screen.getByTestId('circle-embed-webview');
    expect(webView.props.source.html).toContain(
      '<iframe src="https://media.example/live"></iframe>',
    );
    expect(webView.props.sharedCookiesEnabled).toBe(false);
    expect(webView.props.style).toEqual(expect.objectContaining({ height: 220 }));

    expect(
      webView.props.onShouldStartLoadWithRequest({
        isTopFrame: true,
        url: 'about:blank',
      }),
    ).toBe(true);
    expect(
      webView.props.onShouldStartLoadWithRequest({
        isTopFrame: false,
        url: 'https://media.example/frame-resource',
      }),
    ).toBe(true);
    expect(
      webView.props.onShouldStartLoadWithRequest({
        isTopFrame: true,
        url: 'https://media.example/full-page',
      }),
    ).toBe(false);
    expect(onOpenUrl).toHaveBeenCalledWith('https://media.example/full-page');
    expect(
      webView.props.onShouldStartLoadWithRequest({
        isTopFrame: true,
        url: 'javascript:alert(1)',
      }),
    ).toBe(false);
  });

  it('preserves unknown container children and labels unsupported leaves', () => {
    render(
      <CircleTiptapRenderer doc={hydrateCircleDoc(UNSUPPORTED_TIPTAP_BODY)} />,
    );

    expect(screen.getByText('Readable future content')).toBeOnTheScreen();
    expect(screen.getByTestId('circle-unsupported-poll')).toHaveTextContent(
      'Unsupported content: poll',
    );
    expect(screen.getByTestId('circle-unsupported-futureLeaf')).toHaveTextContent(
      'Unsupported content: futureLeaf',
    );
  });

  it('deliberately categorizes every registered Circle node', () => {
    expect(Object.keys(CIRCLE_NATIVE_NODE_SUPPORT).sort()).toEqual(
      [...circleNodeTypes()].sort(),
    );
    expect(
      Object.entries(CIRCLE_NATIVE_NODE_SUPPORT)
        .filter(([, support]) => support === 'placeholder')
        .map(([type]) => type)
        .sort(),
    ).toEqual(['entity', 'file', 'mention', 'poll']);
  });
});
