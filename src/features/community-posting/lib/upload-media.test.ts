import type { PickedMedia } from '@/features/community-posting/types';

import { uploadMedia } from '@/features/community-posting/lib/upload-media';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));
jest.mock('@/features/community-posting/lib/md5', () => ({ fileDigest: jest.fn(async () => ({ checksum: 'md5b64==', byteSize: 1234 })) }));

const mockUploadAsync = jest.fn();
const mockCancel = jest.fn();
const mockCreateTask = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  createUploadTask: (...args: unknown[]) => mockCreateTask(...args),
}));

const mockPost = client.post as jest.Mock;
const MEDIA: PickedMedia = { uri: 'file:///a.jpg', kind: 'image', mimeType: 'image/jpeg', fileName: 'my photo.jpg', fileSize: 1234 };
const PRESIGN = {
  data: { kind: 'image', uploadUrl: 'https://s3.example/put', uploadHeaders: { 'Content-Type': 'image/jpeg', 'Content-MD5': 'md5b64==' }, signedId: 's', cdnUrl: 'c', mediaToken: 'tok' },
};

describe('uploadMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue(PRESIGN);
    mockUploadAsync.mockResolvedValue({ status: 200 });
    mockCreateTask.mockImplementation(() => ({ uploadAsync: mockUploadAsync, cancelAsync: mockCancel }));
  });

  it('requests a presign then PUTs the file with exactly the returned headers', async () => {
    const onProgress = jest.fn();
    await expect(uploadMedia(MEDIA, { organizationId: 'org-1', onProgress })).resolves.toBe('tok');

    expect(mockPost).toHaveBeenCalledWith('/api/community/media-upload', {
      organizationId: 'org-1',
      filename: 'my-photo.jpg',
      contentType: 'image/jpeg',
      byteSize: 1234,
      checksum: 'md5b64==',
    });
    expect(mockCreateTask).toHaveBeenCalledWith(
      'https://s3.example/put',
      'file:///a.jpg',
      { httpMethod: 'PUT', uploadType: 0, headers: PRESIGN.data.uploadHeaders },
      expect.any(Function),
    );
    mockCreateTask.mock.calls[0][3]({ totalBytesSent: 50, totalBytesExpectedToSend: 100 });
    expect(onProgress).toHaveBeenLastCalledWith(0.5);
  });

  it('does not start the PUT when removed during presign', async () => {
    const controller = new AbortController();
    mockPost.mockImplementationOnce(async () => {
      controller.abort();
      return PRESIGN;
    });
    await expect(uploadMedia(MEDIA, { organizationId: 'org-1', signal: controller.signal })).rejects.toThrow('aborted');
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('does not retry when our API rejects the file', async () => {
    mockPost.mockRejectedValue(Object.assign(new Error('400'), { response: { status: 400 } }));
    await expect(uploadMedia(MEDIA, { organizationId: 'org-1' })).rejects.toThrow('400');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('retries once then succeeds', async () => {
    mockUploadAsync.mockResolvedValueOnce({ status: 500 }).mockResolvedValueOnce({ status: 200 });
    await expect(uploadMedia(MEDIA, { organizationId: 'org-1' })).resolves.toBe('tok');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('fails after one retry', async () => {
    mockUploadAsync.mockResolvedValue({ status: 403 });
    await expect(uploadMedia(MEDIA, { organizationId: 'org-1' })).rejects.toThrow('403');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('does not retry once aborted and cancels the task', async () => {
    const controller = new AbortController();
    mockUploadAsync.mockImplementation(async () => {
      controller.abort();
      return null;
    });
    await expect(uploadMedia(MEDIA, { organizationId: 'org-1', signal: controller.signal })).rejects.toThrow();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
