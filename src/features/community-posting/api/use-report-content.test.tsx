import { act, renderHook } from '@testing-library/react-native';

import { useReportContent } from '@/features/community-posting/api/use-report-content';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn() } }));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const SCOPE = { organizationId: 'org-1', memberId: 'member-1' };

describe('useReportContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the report payload and resolves true on ok:true', async () => {
    mockPost.mockResolvedValue({ data: { ok: true } });
    const { result } = renderHook(() => useReportContent(SCOPE));

    let outcome;
    await act(async () => {
      outcome = await result.current.report({
        surface: 'post',
        postId: 'post-1',
        excerpt: 'Some text',
        reason: 'spam',
      });
    });

    expect(mockPost).toHaveBeenCalledWith('/api/community/report', {
      organizationId: 'org-1',
      surface: 'post',
      postId: 'post-1',
      commentId: undefined,
      spaceId: undefined,
      excerpt: 'Some text',
      authorName: undefined,
      reason: 'spam',
      note: undefined,
    });
    expect(outcome).toBe(true);
  });

  it('resolves false when the backend reports ok:false', async () => {
    mockPost.mockResolvedValue({ data: { ok: false } });
    const { result } = renderHook(() => useReportContent(SCOPE));

    let outcome;
    await act(async () => {
      outcome = await result.current.report({
        surface: 'comment',
        postId: 'post-1',
        commentId: 'comment-1',
        excerpt: 'Some text',
        reason: 'abusive',
      });
    });
    expect(outcome).toBe(false);
  });

  it('resolves false on a network error instead of throwing', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useReportContent(SCOPE));

    let outcome;
    await act(async () => {
      outcome = await result.current.report({
        surface: 'post',
        postId: 'post-1',
        excerpt: 'Some text',
        reason: 'other',
      });
    });
    expect(outcome).toBe(false);
  });
});
