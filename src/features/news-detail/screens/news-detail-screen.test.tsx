import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { NewsDetailScreen } from '@/features/news-detail/screens/news-detail-screen';

let mockQuery: Record<string, unknown>;
const mockStatusBar = jest.fn((_props: { barStyle?: string }) => null);
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ 'news-post-id': 'big-day' }),
  useRouter: () => ({ back: jest.fn() }),
  Stack: { Screen: () => null },
}));
jest.mock('@/components/ui/screen-layout', () => ({ useScreenTopPadding: () => 0 }));
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: (props: { barStyle?: string }) => mockStatusBar(props), Image: 'Image' };
});
jest.mock('@/features/pulse/api/use-news-post', () => ({ useNewsPost: () => mockQuery }));

const POST = {
  id: '1',
  slug: 'big-day',
  title: 'A big day at Leopardstown',
  subtitle: 'Three runners',
  featuredImageUrl: 'https://img/x.jpg',
  contentHtml: '<h2>The card</h2><p>See <a href="https://rionna.com">more</a>.</p><blockquote><p>Run on.</p></blockquote>',
  publishedAt: '2026-03-01T10:00:00Z',
  author: { name: 'Sarah' },
};

describe('newsDetailScreen', () => {
  it('renders the hero title, date and styled body', () => {
    mockQuery = { data: POST, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false };
    render(<NewsDetailScreen />);
    expect(screen.getByText('A big day at Leopardstown')).toBeOnTheScreen();
    expect(screen.getByText('The card')).toBeOnTheScreen();
    expect(screen.getByText('more').props.className).toContain('text-plum-mid');
    expect(screen.getByTestId('article-quote')).toBeOnTheScreen();
  });

  it('shows an error state with retry when the post fails', () => {
    mockQuery = { data: undefined, isLoading: false, isError: true, refetch: jest.fn(), isRefetching: false };
    render(<NewsDetailScreen />);
    expect(screen.getByText('Article not found')).toBeOnTheScreen();
  });

  it('shows the article skeleton, not a spinner, on first load (A-015)', () => {
    mockQuery = { data: undefined, isLoading: true, isError: false, refetch: jest.fn(), isRefetching: false };
    render(<NewsDetailScreen />);
    expect(screen.getByTestId('news-loading')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
  });

  it('turns the status bar dark once the hero scrolls away (A-012)', () => {
    mockQuery = { data: POST, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false };
    render(<NewsDetailScreen />);
    const lastStyle = () => mockStatusBar.mock.calls.at(-1)![0].barStyle;
    expect(lastStyle()).toBe('light');
    fireEvent(screen.getByTestId('article-hero'), 'layout', { nativeEvent: { layout: { height: 320 } } });
    const scroll = screen.UNSAFE_getByProps({ contentInsetAdjustmentBehavior: 'never' });
    act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 400 } } }));
    expect(lastStyle()).toBe('dark');
    act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 10 } } }));
    expect(lastStyle()).toBe('light');
  });
});
