import { View } from 'react-native';

const player = {
  muted: false,
  loop: false,
  play: jest.fn(),
  pause: jest.fn(),
};

module.exports = {
  useVideoPlayer: jest.fn((_source: unknown, setup?: (p: typeof player) => void) => {
    setup?.(player);
    return player;
  }),
  VideoView: View,
};
