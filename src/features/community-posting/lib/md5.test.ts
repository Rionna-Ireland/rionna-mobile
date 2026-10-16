import { hexToBase64, md5Base64 } from '@/features/community-posting/lib/md5';

const mockGetInfo = jest.fn();
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: (...args: unknown[]) => mockGetInfo(...args) }));

describe('md5', () => {
  it('converts a hex digest to base64', () => {
    // md5("") = d41d8cd98f00b204e9800998ecf8427e
    expect(hexToBase64('d41d8cd98f00b204e9800998ecf8427e')).toBe('1B2M2Y8AsgTpgAmY7PhCfg==');
  });

  it('hashes the file on disk and returns base64', async () => {
    mockGetInfo.mockResolvedValue({ exists: true, md5: 'd41d8cd98f00b204e9800998ecf8427e' });
    await expect(md5Base64('file:///a.jpg')).resolves.toBe('1B2M2Y8AsgTpgAmY7PhCfg==');
    expect(mockGetInfo).toHaveBeenCalledWith('file:///a.jpg', { md5: true });
  });

  it('throws when the file cannot be hashed', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    await expect(md5Base64('file:///missing')).rejects.toThrow();
  });
});
