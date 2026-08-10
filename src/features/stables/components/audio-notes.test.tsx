import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { AudioNotes } from '@/features/stables/components/audio-notes';

type MockPlayer = {
  playing: boolean;
  addListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
};

const mockPlayers: MockPlayer[] = [];
const mockSetAudioModeAsync = jest.fn((_options?: unknown) => Promise.resolve());

function mockCreatePlayer(): MockPlayer {
  let listener: ((status: { playing: boolean; didJustFinish: boolean }) => void) | null = null;
  const player = {
    playing: false,
    addListener: jest.fn((_event: string, cb: typeof listener) => {
      listener = cb;
    }),
    play: jest.fn(() => {
      player.playing = true;
      listener?.({ playing: true, didJustFinish: false });
    }),
    pause: jest.fn(() => {
      player.playing = false;
      listener?.({ playing: false, didJustFinish: false });
    }),
    seekTo: jest.fn(() => Promise.resolve()),
    remove: jest.fn(),
  };
  mockPlayers.push(player);
  return player;
}

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockCreatePlayer()),
  setAudioModeAsync: (options?: unknown) => mockSetAudioModeAsync(options),
}));

describe('audioNotes', () => {
  beforeEach(() => {
    mockPlayers.length = 0;
    mockSetAudioModeAsync.mockClear();
  });
  it('renders nothing when there are no notes', () => {
    const { toJSON } = render(<AudioNotes notes={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when notes is undefined', () => {
    const { toJSON } = render(<AudioNotes notes={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('lists notes with a caption fallback and toggles play/pause on tap', () => {
    render(
      <AudioNotes
        notes={[
          { url: 'https://cdn.test/note-1.mp3', caption: 'Morning check-in' },
          { url: 'https://cdn.test/note-2.mp3' },
        ]}
      />,
    );

    expect(screen.getByText('Morning check-in')).toBeOnTheScreen();
    expect(screen.getByText('Audio note 2')).toBeOnTheScreen();

    const firstRow = screen.getByTestId('audio-note-0');
    expect(screen.getAllByLabelText('Play audio note')).toHaveLength(2);

    fireEvent.press(firstRow);
    expect(screen.getByLabelText('Pause audio note')).toBeOnTheScreen();
    // Session escalation happens once, on the suite's first play.
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });

    fireEvent.press(firstRow);
    expect(screen.getAllByLabelText('Play audio note')).toHaveLength(2);
  });

  it('pauses the playing note when another starts', () => {
    render(
      <AudioNotes
        notes={[
          { url: 'https://cdn.test/note-1.mp3' },
          { url: 'https://cdn.test/note-2.mp3' },
        ]}
      />,
    );

    fireEvent.press(screen.getByTestId('audio-note-0'));
    expect(mockPlayers[0]?.playing).toBe(true);

    fireEvent.press(screen.getByTestId('audio-note-1'));
    expect(mockPlayers[0]?.pause).toHaveBeenCalled();
    expect(mockPlayers[0]?.playing).toBe(false);
    expect(mockPlayers[1]?.playing).toBe(true);
  });
});
