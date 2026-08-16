describe('verifyClubMembership', () => {
  function loadModule() {
    let loaded: any;
    jest.isolateModules(() => {
      loaded = require('./club-verification');
    });
    return loaded!;
  }

  const get = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_CLUB_ID = 'club_123';
    get.mockReset();
    jest.doMock('@/lib/api/client', () => ({
      client: { get },
    }));
  });

  it('returns true when the API reports membership', async () => {
    get.mockResolvedValue({ data: { isMember: true } });
    const { verifyClubMembership } = loadModule();

    await expect(verifyClubMembership()).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith('/api/organizations/verify-membership', {
      params: { organizationId: 'club_123' },
    });
  });

  it('returns false when the API reports the user is not a member', async () => {
    get.mockResolvedValue({ data: { isMember: false } });
    const { verifyClubMembership } = loadModule();

    await expect(verifyClubMembership()).resolves.toBe(false);
  });

  it('propagates request failures instead of treating them as a club mismatch', async () => {
    const err = Object.assign(new Error('Request failed with status code 401'), {
      response: { status: 401 },
    });
    get.mockRejectedValue(err);
    const { verifyClubMembership } = loadModule();

    await expect(verifyClubMembership()).rejects.toBe(err);
  });
});
