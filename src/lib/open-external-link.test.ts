import { Linking } from 'react-native';

import { openExternalLink } from '@/lib/open-external-link';

const mockOpenBrowserAsync = jest.fn((_url: string) => Promise.resolve());
jest.mock('expo-web-browser', () => ({ openBrowserAsync: (url: string) => mockOpenBrowserAsync(url) }));

describe('openExternalLink', () => {
  beforeEach(() => {
    mockOpenBrowserAsync.mockClear();
    jest.spyOn(Linking, 'openURL').mockClear().mockResolvedValue(true);
  });

  it('opens web links in the in-app browser', () => {
    openExternalLink('https://rionna.com');
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://rionna.com');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('hands other schemes to the OS', () => {
    openExternalLink('mailto:hello@rionna.com');
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith('mailto:hello@rionna.com');
  });

  it('hands tel: links to the OS', () => {
    openExternalLink('tel:+353000000');
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+353000000');
  });

  it('ignores other schemes', () => {
    openExternalLink('rionna://stables/x');
    openExternalLink('javascript:alert(1)');
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
