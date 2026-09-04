import { ImageTooLargeError, ImageUploadError, sanitizeFilename, uploadImage } from '@/features/community-posting/lib/upload-image';
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

    expect(mockPost).toHaveBeenCalledWith('/api/community/post-image-upload-url', {
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

  it('throws ImageUploadError when the PUT response is not ok', async () => {
    mockPost.mockResolvedValue({
      data: { signedUploadUrl: 'https://storage.example/upload?sig=abc', path: 'orgs/org-1/posts/photo.jpg' },
    });
    const blob = { size: 1234 };
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    let error: unknown;
    try {
      await uploadImage(SCOPE, IMAGE);
    }
    catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ImageUploadError);
    expect((error as ImageUploadError).status).toBe(403);
  });

  it('falls back to the fetched blob size when the picker reported 0', async () => {
    mockPost.mockResolvedValue({
      data: { signedUploadUrl: 'https://storage.example/upload?sig=abc', path: 'orgs/org-1/posts/photo.jpg' },
    });
    const blob = { size: 1234 };
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce({ ok: true });

    await uploadImage(SCOPE, { ...IMAGE, fileSize: 0 });

    expect(mockPost).toHaveBeenCalledWith('/api/community/post-image-upload-url', expect.objectContaining({
      fileSize: 1234,
    }));
  });

  it('throws ImageTooLargeError when the resolved size exceeds 10MB', async () => {
    const blob = { size: 10 * 1024 * 1024 + 1 };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ blob: () => Promise.resolve(blob) });

    let error: unknown;
    try {
      await uploadImage(SCOPE, { ...IMAGE, fileSize: 0 });
    }
    catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ImageTooLargeError);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('sanitizeFilename', () => {
  it('replaces disallowed characters and collapses runs of them', () => {
    expect(sanitizeFilename('IMG 1234 (1).HEIC')).toBe('IMG-1234-1-.HEIC');
  });

  it('falls back to a generated name when nothing usable survives', () => {
    expect(sanitizeFilename('')).toMatch(/^photo-\d+\.jpg$/);
    expect(sanitizeFilename('...')).toMatch(/^photo-\d+\.jpg$/);
  });

  it('leaves an already-safe filename untouched', () => {
    expect(sanitizeFilename('photo.jpg')).toBe('photo.jpg');
  });
});
