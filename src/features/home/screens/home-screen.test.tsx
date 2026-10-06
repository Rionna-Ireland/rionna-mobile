import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { RefreshControl } from 'react-native';

import { HomeScreen } from '@/features/home/screens/home-screen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(cb, [cb]);
  },
}));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null, Image: 'Image' };
});

jest.mock('@/components/ui/screen-layout', () => ({
  useScreenTopPadding: () => 70,
}));

jest.mock('@/components/ui/tab-bar-layout', () => ({
  useTabBarContentPadding: () => 120,
}));

let mockUser: { id: string; email: string; name?: string } = { id: 'member-1', email: 'jane@example.com', name: 'Jane Member' };
jest.mock('@/features/auth/use-auth-store', () => ({
  useAuthStore: { use: { user: () => mockUser } },
}));

const mockPending = new Set<unknown>();
/** A query whose `data` is in `mockPending` is a cold first load: pending AND fetching, no data. */
const mockFailed = Symbol('failed');
function mockQuery(data: unknown) {
  if (data === mockFailed)
    return { data: undefined, isPending: true, isFetching: false, isLoading: false, isError: true, isRefetching: false, refetch: jest.fn() };
  const cold = mockPending.has(data);
  return {
    data: cold ? undefined : data,
    isPending: cold || data === undefined,
    isFetching: cold,
    isLoading: cold,
    isRefetching: false,
    refetch: jest.fn(),
  };
}

const mockData: Record<string, unknown> = {};
function reset() {
  for (const key of Object.keys(mockData)) delete mockData[key];
}

jest.mock('@/features/pulse/api/use-next-run', () => ({ useNextRun: () => mockQuery(mockData.nextRun) }));
jest.mock('@/features/pulse/api/use-latest-results', () => ({ useLatestResults: () => mockQuery(mockData.results) }));
jest.mock('@/features/pulse/api/use-latest-news', () => ({ useLatestNews: () => mockQuery(mockData.news) }));
jest.mock('@/features/stables/api/use-followed-horses', () => ({ useFollowedHorses: () => mockQuery(mockData.followed) }));
jest.mock('@/features/member-content/api/use-inside-track', () => ({ useInsideTrack: () => mockQuery(mockData.insideTrack) }));
jest.mock('@/features/events/api/use-events', () => ({ useEvents: () => mockQuery(mockData.events) }));
jest.mock('@/features/paddock/api/use-charity', () => ({ useCharity: () => mockQuery(mockData.charity) }));
jest.mock('@/features/notification-centre/api/use-inbox-badge', () => ({ useInboxBadge: () => mockQuery(mockData.badge) }));

const news = [{
  id: 'n1',
  slug: 'ashfield',
  title: 'Ashfield Rose declares for Leopardstown',
  subtitle: 'Ger says she has never worked better.',
  featuredImageUrl: null,
  publishedAt: new Date().toISOString(),
  author: null,
}];

describe('homeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
    mockPending.clear();
    mockUser = { id: 'member-1', email: 'jane@example.com', name: 'Jane Member' };
  });

  it('greets by first name and shows the bell and avatar', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(/^Good (morning|afternoon|evening), Jane$/);
    expect(screen.getByTestId('home-bell')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-avatar'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('greets without a name', () => {
    mockUser = { id: 'member-1', email: 'jane@example.com' };
    render(<HomeScreen />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(/^Good (morning|afternoon|evening)$/);
  });

  it('stays composed with no data: chips, empty My horses, no hero/charity/events', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('home-chips-unread')).toBeOnTheScreen();
    expect(screen.getByTestId('home-chips-events')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-chips-raceDay')).not.toBeOnTheScreen();
    expect(screen.queryByText('Mentions')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('home-hero')).not.toBeOnTheScreen();
    expect(screen.getByText('Follow a horse to see it here')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-charity')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('home-event')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('home-inside-track')).not.toBeOnTheScreen();
  });

  it('routes chips to their targets', () => {
    mockData.badge = 3;
    render(<HomeScreen />);
    expect(screen.getByTestId('home-chips-unread-count')).toHaveTextContent('3');
    fireEvent.press(screen.getByTestId('home-chips-unread'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
    fireEvent.press(screen.getByTestId('home-chips-events'));
    expect(mockPush).toHaveBeenCalledWith('/events');
  });

  it('renders the news hero and opens the article', () => {
    mockData.news = news;
    render(<HomeScreen />);
    expect(screen.getByText('Ashfield Rose declares for Leopardstown')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-hero-cta-0'));
    expect(mockPush).toHaveBeenCalledWith('/news/ashfield');
  });

  it('renders followed horses, charity and the next event', () => {
    mockData.followed = [{ id: 'h1', name: 'Ashfield Rose', photos: [] }];
    mockData.charity = { ok: true, charity: { charityName: 'Womens Health', totalCents: 2_450_000 } };
    mockData.events = {
      ok: true,
      configured: true,
      events: [{ id: 'e1', title: 'Race day: Leopardstown', startsAt: null, rsvp: { count: 8, limit: 20 } }],
    };
    render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('home-horse-h1'));
    expect(mockPush).toHaveBeenCalledWith('/stables/h1');

    // First view: the S14-06 count-up, read as one label.
    expect(screen.getByLabelText('€24,500')).toBeOnTheScreen();
    expect(screen.getByText('raised for Womens Health')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-charity-open'));
    expect(mockPush).toHaveBeenCalledWith('/paddock/charity');
    // A-041: the whole card opens Charity too, with one summary label.
    mockPush.mockClear();
    fireEvent.press(screen.getByLabelText('Charity snapshot, €24,500 raised for Womens Health'));
    expect(mockPush).toHaveBeenCalledWith('/paddock/charity');

    expect(screen.getByText('12/20 slots remaining')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-event'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/event/[event-id]', params: { 'event-id': 'e1' } });
  });

  it('opens the Inside Track item and tags fresh pieces NEW', () => {
    mockData.insideTrack = {
      ok: true,
      configured: true,
      pinned: [],
      latest: [{ id: 'p1', spaceId: 's1', title: 'How a filly is named', createdAt: new Date().toISOString(), imageUrl: null }],
    };
    render(<HomeScreen />);
    expect(screen.getByTestId('home-inside-track-new')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-inside-track'));
    expect(mockPush).toHaveBeenCalledWith('/post/s1/p1');
  });
});

describe('homeScreen skeletons', () => {
  beforeEach(() => {
    reset();
    mockPending.clear();
  });

  it('shows block skeletons only on a cold first load, then crossfades in the cards', () => {
    const followed = [{ id: 'h1', name: 'Ashfield Rose', photos: [] }];
    mockData.followed = followed;
    mockData.news = news;
    mockPending.add(followed);
    mockPending.add(news);
    const { rerender } = render(<HomeScreen />);
    expect(screen.getByTestId('home-my-horses-skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hero-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-my-horses')).not.toBeOnTheScreen();
    // Not loading (no fetch running) → no skeleton for charity/events/inside track.
    expect(screen.queryByTestId('home-charity-skeleton')).not.toBeOnTheScreen();

    mockPending.clear();
    rerender(<HomeScreen />);
    expect(screen.queryByTestId('home-my-horses-skeleton')).not.toBeOnTheScreen();
    expect(screen.getByTestId('home-my-horses')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hero')).toBeOnTheScreen();
  });

  it('cached data renders straight away with no skeleton', () => {
    mockData.followed = [{ id: 'h1', name: 'Ashfield Rose', photos: [] }];
    render(<HomeScreen />);
    expect(screen.queryByTestId('home-my-horses-skeleton')).not.toBeOnTheScreen();
    expect(screen.getByTestId('home-my-horses')).toBeOnTheScreen();
  });

  it('wires the branded refresher: transparent native spinner + submark overlay, refetching on pull', async () => {
    const view = render(<HomeScreen />);
    const control = view.UNSAFE_getByType(RefreshControl);
    expect(control.props.tintColor).toBe('transparent');
    expect(screen.getByTestId('refresh-indicator', { includeHiddenElements: true })).toBeTruthy();
    act(() => control.props.onRefresh());
    expect(view.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);
    await waitFor(() => expect(view.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false));
  });
});

describe('homeScreen offline', () => {
  beforeEach(() => {
    reset();
    mockPending.clear();
  });

  it('cold offline: one error state with retry, not a false "Follow a horse" (A-019)', () => {
    mockData.followed = mockFailed;
    mockData.news = mockFailed;
    render(<HomeScreen />);
    expect(screen.getByTestId('home-unavailable')).toBeOnTheScreen();
    expect(screen.queryByText('Follow a horse to see it here')).not.toBeOnTheScreen();
  });

  it('one non-horse block failing leaves the rest of Home alone', () => {
    mockData.charity = mockFailed;
    mockData.followed = [];
    render(<HomeScreen />);
    expect(screen.queryByTestId('home-unavailable')).not.toBeOnTheScreen();
    expect(screen.getByText('Follow a horse to see it here')).toBeOnTheScreen();
  });
});
