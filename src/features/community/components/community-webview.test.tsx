import { render, screen } from '@testing-library/react-native';

import { CommunityWebView } from './community-webview';

let mockLocalSearchParams: { notificationTap?: string | string[] } = {};
let mockWebViewMountCount = 0;

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => mockLocalSearchParams),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock('@/features/community/hooks/use-community-session', () => ({
  useCommunitySession: jest.fn((initialUrl?: string) => ({
    accessToken: 'token',
    bootstrapUrl: 'https://community.rionna.club/mobile-login',
    postBootstrapPath: initialUrl === 'https://community.rionna.club/c/test-horse/testing'
      ? '/c/test-horse/testing'
      : '/feed',
    loading: false,
    error: false,
    errorMessage: null,
    refresh: jest.fn(),
  })),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const WebView = ({ ref: _ref, ..._props }) => {
    const mountId = React.useRef(++mockWebViewMountCount);
    return <Text testID="webview-mount">{`mount:${mountId.current}`}</Text>;
  };

  return { WebView };
});

describe('communityWebView', () => {
  beforeEach(() => {
    mockLocalSearchParams = {};
    mockWebViewMountCount = 0;
  });

  it('remounts the WebView when a warm notification tap token changes', () => {
    const { rerender } = render(
      <CommunityWebView initialUrl="https://community.rionna.club/feed" />,
    );

    expect(screen.getByTestId('webview-mount').props.children).toBe('mount:1');

    mockLocalSearchParams = { notificationTap: 'tap-1' };
    rerender(
      <CommunityWebView initialUrl="https://community.rionna.club/c/test-horse/testing" />,
    );

    expect(screen.getByTestId('webview-mount').props.children).toBe('mount:2');
  });
});
