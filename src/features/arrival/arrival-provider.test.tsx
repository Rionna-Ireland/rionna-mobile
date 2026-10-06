import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { Text } from 'react-native';

import { haptics } from '@/lib/motion';

import { useArrival } from './arrival-context';
import { ArrivalOverlay } from './arrival-overlay';
import { ArrivalProvider } from './arrival-provider';
import { ArrivalSlot, useArrivalReady } from './arrival-slot';

let mockPathname = '/';
jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(),
  setOptions: jest.fn(),
}));
jest.mock('react-native-edge-to-edge', () => ({ SystemBars: () => null }));
jest.mock('@/lib/motion/haptics', () => ({ land: jest.fn(), haptic: {} }));
jest.mock('./lib/welcome-flag', () => ({ hasSeenWelcome: jest.fn(() => false), markWelcomeSeen: jest.fn() }));

/** The launch overlay is hidden from a11y (decorative), so queries opt in. */
const HIDDEN = { includeHiddenElements: true };

const SLOT = { x: 16, y: 60, width: 36, height: 32.4 };

/** Stands in for Home: reports its header slot and, when told, its data. */
function FakeHome({ ready }: { ready: boolean }) {
  const { reportSlot, state } = useArrival();
  useArrivalReady('home', ready);
  React.useEffect(() => reportSlot('home', SLOT), [reportSlot, state.run]);
  return (
    <ArrivalSlot name="home" testID="slot">
      <Text>mark</Text>
    </ArrivalSlot>
  );
}

function Phase() {
  return <Text testID="phase">{useArrival().state.phase}</Text>;
}

function App({ ready, status = 'signIn' }: { ready: boolean; status?: 'idle' | 'signIn' | 'signOut' }) {
  return (
    <ArrivalProvider status={status}>
      <FakeHome ready={ready} />
      <Phase />
      <ArrivalOverlay />
    </ArrivalProvider>
  );
}

const phase = () => screen.getByTestId('phase').props.children;

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('arrival provider + overlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPathname = '/';
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('hides the native splash on the overlay\'s first layout', () => {
    render(<App ready={false} />);
    const overlay = screen.getByTestId('arrival-overlay', HIDDEN);
    expect(overlay).toBeOnTheScreen();
    fireEvent(overlay, 'layout', { nativeEvent: { layout: {} } });
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('data early: hands off at the fill, lands haptics, then unmounts and logs', () => {
    render(<App ready />);
    expect(phase()).toBe('drawing');
    advance(900);
    expect(haptics.land).toHaveBeenCalledTimes(1);
    advance(180);
    expect(phase()).toBe('handingOff');
    advance(1000);
    expect(phase()).toBe('done');
    expect(screen.queryByTestId('arrival-overlay', HIDDEN)).toBeNull();
    expect(console.log).toHaveBeenCalledWith('[arrival]', expect.stringContaining('"ttiMs"'));
  });

  it('data late: waits, then hands off when Home is ready', () => {
    const view = render(<App ready={false} />);
    advance(1080 + 400);
    expect(phase()).toBe('waitingForData');
    view.rerender(<App ready />);
    expect(phase()).toBe('handingOff');
  });

  it('never holds the app past the data-wait cap', () => {
    render(<App ready={false} />);
    advance(1080 + 1200);
    expect(phase()).toBe('handingOff');
    advance(1000);
    expect(phase()).toBe('done');
  });

  it('welcome after sign-in covers, navigates, and hands off to Home', () => {
    const onCovered = jest.fn();
    function Trigger() {
      const { beginWelcome } = useArrival();
      return <Text testID="go" onPress={() => beginWelcome({ id: 'u1', name: 'Tom Power' }, onCovered)}>go</Text>;
    }
    render(
      <ArrivalProvider status="signIn">
        <FakeHome ready />
        <Trigger />
        <Phase />
        <ArrivalOverlay />
      </ArrivalProvider>,
    );
    advance(1080);
    advance(1000);
    expect(phase()).toBe('done');
    fireEvent.press(screen.getByTestId('go'));
    expect(phase()).toBe('drawing');
    expect(screen.getByTestId('welcome-name')).toHaveTextContent('Tom');
    expect(screen.getByTestId('arrival-wave')).toBeOnTheScreen();
    advance(180);
    expect(onCovered).toHaveBeenCalled();
    advance(1600);
    expect(phase()).toBe('handingOff');
  });
});
