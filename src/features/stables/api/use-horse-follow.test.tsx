import type { Horse, HorseDetail } from '@/features/stables/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { showErrorMessage } from '@/components/ui/utils';
import {
  applyFollowToHorseDetail,
  applyFollowToHorseList,
  applyOptimisticFollow,
  reconcileFollow,
  rollbackOptimisticFollow,
  sendHorseFollow,
  useFollowHorse,
} from '@/features/stables/api/use-horse-follow';
import { STABLES_QUERY_ROOT } from '@/features/stables/types';
import { client } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  client: { post: jest.fn(), delete: jest.fn() },
}));

jest.mock('@/components/ui/utils', () => ({
  showErrorMessage: jest.fn(),
}));

const mockPost = client.post as jest.MockedFunction<typeof client.post>;
const mockDelete = client.delete as jest.MockedFunction<typeof client.delete>;

function horse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 'horse-1',
    organizationId: 'org-1',
    slug: 'horse-1',
    name: 'Laska',
    status: 'IN_TRAINING',
    isFollowing: false,
    inviteOnly: false,
    bio: null,
    trainerNotes: null,
    photos: [],
    pedigree: null,
    ownershipBlurb: null,
    circleSpaceId: null,
    trainerId: null,
    trainer: null,
    sortOrder: 0,
    publishedAt: '2026-01-01T00:00:00.000Z',
    latestEntryId: null,
    nextEntryId: null,
    providerEntityId: null,
    providerLastSync: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function horseDetail(overrides: Partial<HorseDetail> = {}): HorseDetail {
  return { ...horse(), entries: [], ...overrides };
}

describe('sendHorseFollow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a POST to follow the horse', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await expect(sendHorseFollow({ horseId: 'horse-1', following: true })).resolves.toEqual({
      isFollowing: true,
    });
    expect(mockPost).toHaveBeenCalledWith('/api/horses/horse-1/follow');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('sends a DELETE to unfollow the horse', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    await expect(sendHorseFollow({ horseId: 'horse-1', following: false })).resolves.toEqual({
      isFollowing: false,
    });
    expect(mockDelete).toHaveBeenCalledWith('/api/horses/horse-1/follow');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects when the backend refuses an invite-only follow', async () => {
    mockPost.mockResolvedValue({ data: { ok: false, inviteOnly: true } });
    await expect(sendHorseFollow({ horseId: 'horse-1', following: true })).rejects.toThrow();
  });
});

describe('applyFollowToHorseList', () => {
  it('flips isFollowing on the target horse only', () => {
    const horses = [horse(), horse({ id: 'horse-2', isFollowing: true })];
    const next = applyFollowToHorseList(horses, 'horse-1', true);
    expect(next[0]).toMatchObject({ isFollowing: true });
    expect(next[1]).toMatchObject({ isFollowing: true });
  });

  it('returns the same reference when already in the desired state', () => {
    const horses = [horse({ isFollowing: true })];
    expect(applyFollowToHorseList(horses, 'horse-1', true)).toBe(horses);
  });
});

describe('applyFollowToHorseDetail', () => {
  it('flips the detail payload when it is the target horse', () => {
    expect(applyFollowToHorseDetail(horseDetail(), 'horse-1', true)).toMatchObject({
      isFollowing: true,
    });
  });

  it('leaves other horses untouched', () => {
    const other = horseDetail({ id: 'horse-9' });
    expect(applyFollowToHorseDetail(other, 'horse-1', true)).toBe(other);
  });
});

describe('optimistic cache update', () => {
  const LIST_KEY = [STABLES_QUERY_ROOT, 'org-1'];
  const FOLLOWING_KEY = [STABLES_QUERY_ROOT, 'following', 'org-1'];
  const DETAIL_KEY = [STABLES_QUERY_ROOT, 'horse-1'];

  function seededClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
    });
    queryClient.setQueryData(LIST_KEY, [horse(), horse({ id: 'horse-2' })]);
    queryClient.setQueryData(FOLLOWING_KEY, [horse({ isFollowing: true })]);
    queryClient.setQueryData(DETAIL_KEY, horseDetail());
    return queryClient;
  }

  it('flips the horse across the list, following list, and detail caches', () => {
    const queryClient = seededClient();
    applyOptimisticFollow(queryClient, 'horse-1', true);

    expect(queryClient.getQueryData<Horse[]>(LIST_KEY)?.[0]).toMatchObject({ isFollowing: true });
    expect(queryClient.getQueryData<Horse[]>(LIST_KEY)?.[1]).toMatchObject({ isFollowing: false });
    expect(queryClient.getQueryData<HorseDetail>(DETAIL_KEY)).toMatchObject({ isFollowing: true });
  });

  it('rolls every touched cache back to its snapshot on error', () => {
    const queryClient = seededClient();
    const snapshots = applyOptimisticFollow(queryClient, 'horse-1', true);
    rollbackOptimisticFollow(queryClient, snapshots);

    expect(queryClient.getQueryData<Horse[]>(LIST_KEY)?.[0]).toMatchObject({ isFollowing: false });
    expect(queryClient.getQueryData<HorseDetail>(DETAIL_KEY)).toMatchObject({ isFollowing: false });
  });

  it('does not snapshot caches the horse does not appear in', () => {
    const queryClient = seededClient();
    const snapshots = applyOptimisticFollow(queryClient, 'horse-2', true);
    expect(snapshots.map(([key]) => key)).toEqual([LIST_KEY]);
  });

  describe('reconcileFollow', () => {
    it('writes the server follow state over the optimistic guess in every cache', () => {
      const queryClient = seededClient();
      applyOptimisticFollow(queryClient, 'horse-1', true);
      reconcileFollow(queryClient, { horseId: 'horse-1', isFollowing: false });

      expect(queryClient.getQueryData<Horse[]>(LIST_KEY)?.[0]).toMatchObject({ isFollowing: false });
      expect(queryClient.getQueryData<HorseDetail>(DETAIL_KEY)).toMatchObject({ isFollowing: false });
    });

    it('leaves matching caches untouched (same references)', () => {
      const queryClient = seededClient();
      applyOptimisticFollow(queryClient, 'horse-1', true);
      const listBefore = queryClient.getQueryData<Horse[]>(LIST_KEY);
      reconcileFollow(queryClient, { horseId: 'horse-1', isFollowing: true });

      expect(queryClient.getQueryData<Horse[]>(LIST_KEY)).toBe(listBefore);
    });
  });
});

describe('useFollowHorse', () => {
  const FOLLOWING_KEY = [STABLES_QUERY_ROOT, 'following', 'org-1'];

  beforeEach(() => jest.clearAllMocks());

  function wrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  }

  it('invalidates the followed-horses list on settle so membership refetches, not just cached flips', async () => {
    // reconcileFollow only flips isFollowing on horses already present in a
    // cache — it never inserts a newly-followed horse into the following
    // list, so that cache must be invalidated directly instead.
    mockPost.mockResolvedValue({ data: {} });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(FOLLOWING_KEY, [horse({ isFollowing: true })]);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useFollowHorse(), { wrapper: wrapper(queryClient) });
    result.current.toggleFollow({ horseId: 'horse-2', following: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [STABLES_QUERY_ROOT, 'following'] });
  });

  it('still invalidates the followed-horses list when the mutation fails', async () => {
    mockDelete.mockRejectedValue(new Error('network error'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(FOLLOWING_KEY, [horse({ isFollowing: true })]);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useFollowHorse(), { wrapper: wrapper(queryClient) });
    result.current.toggleFollow({ horseId: 'horse-1', following: false });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [STABLES_QUERY_ROOT, 'following'] });
  });

  it('rolls back and shows the invite-only toast when the backend rejects a follow as invite-only', async () => {
    mockPost.mockResolvedValue({ data: { ok: false, inviteOnly: true } });
    const LIST_KEY = [STABLES_QUERY_ROOT, 'org-1'];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(LIST_KEY, [horse({ id: 'horse-1', isFollowing: false })]);

    const { result } = renderHook(() => useFollowHorse(), { wrapper: wrapper(queryClient) });
    result.current.toggleFollow({ horseId: 'horse-1', following: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<Horse[]>(LIST_KEY)?.[0]).toMatchObject({ isFollowing: false });
    expect(showErrorMessage).toHaveBeenCalledWith('This horse is invite only');
  });
});
