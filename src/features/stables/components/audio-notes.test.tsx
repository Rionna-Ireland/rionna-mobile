import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { AudioNotes } from '@/features/stables/components/audio-notes';

function mockCreatePlayer() {
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
  return player;
}

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockCreatePlayer()),
}));

describe('audioNotes', () => {
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

    fireEvent.press(firstRow);
    expect(screen.getAllByLabelText('Play audio note')).toHaveLength(2);
  });
});
