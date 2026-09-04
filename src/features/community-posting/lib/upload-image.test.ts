import { uploadImage } from '@/features/community-posting/lib/upload-image';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };
const IMAGE = {
  uri: 'file:///tmp/photo.jpg',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1234,
};

describe('uploadImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  it('requests a signed URL then PUTs the bytes and returns the imageKey', async () => {
    mockPost.mockResolvedValue({
      data: { signedUploadUrl: 'https://storage.example/upload?sig=abc', path: 'orgs/org-1/posts/photo.jpg' },
    });
    const blob = { size: 1234 };
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce({ ok: true });

    const result = await uploadImage(SCOPE, IMAGE);

    expect(mockPost).toHaveBeenCalledWith('/api/community/posts/image-upload-url', {
      organizationId: 'org-1',
      filename: 'photo.jpg',
      fileSize: 1234,
      contentType: 'image/jpeg',
    });
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, 'file:///tmp/photo.jpg');
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'https://storage.example/upload?sig=abc', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    });
    expect(result).toBe('orgs/org-1/posts/photo.jpg');
  });
});
