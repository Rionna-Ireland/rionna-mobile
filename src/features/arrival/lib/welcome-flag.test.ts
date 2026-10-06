import { getItem, setItem } from '@/lib/storage';

import { hasSeenWelcome, markWelcomeSeen, welcomeKey } from './welcome-flag';

jest.mock('@/lib/storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

describe('welcome flag', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is per member', () => {
    expect(welcomeKey('u1')).not.toBe(welcomeKey('u2'));
  });

  it('reads and writes the member key', () => {
    jest.mocked(getItem).mockReturnValueOnce(true);
    expect(hasSeenWelcome('u1')).toBe(true);
    expect(getItem).toHaveBeenCalledWith(welcomeKey('u1'));
    markWelcomeSeen('u1');
    expect(setItem).toHaveBeenCalledWith(welcomeKey('u1'), true);
  });

  it('treats no member, missing values and storage errors as unseen', () => {
    expect(hasSeenWelcome(null)).toBe(false);
    jest.mocked(getItem).mockReturnValueOnce(null);
    expect(hasSeenWelcome('u1')).toBe(false);
    jest.mocked(getItem).mockImplementationOnce(() => {
      throw new Error('mmkv');
    });
    expect(hasSeenWelcome('u1')).toBe(false);
    markWelcomeSeen(undefined);
    expect(setItem).not.toHaveBeenCalled();
  });
});
