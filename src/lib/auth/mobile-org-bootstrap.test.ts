describe('mobile organization bootstrap', () => {
  function loadModule() {
    let loaded: any;
    jest.isolateModules(() => {
      loaded = require('./mobile-org-bootstrap');
    });
    return loaded!;
  }

  const post = jest.fn();
  const verifyClubMembership = jest.fn();
  const getUser = jest.fn();
  const setUser = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_CLUB_ID = 'club_123';

    post.mockReset();
    verifyClubMembership.mockReset();
    getUser.mockReset().mockReturnValue(null);
    setUser.mockReset();

    jest.doMock('@/lib/auth/utils', () => ({ getUser, setUser }));

    jest.doMock('@/lib/api/client', () => ({
      client: { post },
    }));

    jest.doMock('./club-verification', () => ({
      verifyClubMembership,
      getClubMismatchMessage: () => 'This app is for club members only.',
    }));
  });

  it('activates the configured club after membership is verified', async () => {
    verifyClubMembership.mockResolvedValue(true);
    post.mockResolvedValue({ data: {} });

    const { bootstrapMobileOrganization } = loadModule();

    await expect(
      bootstrapMobileOrganization({ verifyMembership: true }),
    ).resolves.toBe('club_123');

    expect(verifyClubMembership).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/api/auth/organization/set-active', {
      organizationId: 'club_123',
    });
    expect(post).toHaveBeenCalledWith('/api/auth/update-user', {
      lastActiveOrganizationId: 'club_123',
    });
  });

  it('rejects mismatched members before changing the session org', async () => {
    verifyClubMembership.mockResolvedValue(false);

    const { bootstrapMobileOrganization, MobileOrganizationBootstrapError } = loadModule();

    await expect(
      bootstrapMobileOrganization({ verifyMembership: true }),
    ).rejects.toBeInstanceOf(MobileOrganizationBootstrapError);

    expect(post).not.toHaveBeenCalled();
  });

  it('does not treat a verify request failure as a club mismatch', async () => {
    const networkError = new Error('Request failed with status code 401');
    verifyClubMembership.mockRejectedValue(networkError);

    const { bootstrapMobileOrganization } = loadModule();

    await expect(
      bootstrapMobileOrganization({ verifyMembership: true }),
    ).rejects.toBe(networkError);

    expect(post).not.toHaveBeenCalled();
  });

  it('skips set-active and update-user when the club is already the member\'s org', async () => {
    getUser.mockReturnValue({ id: 'u1', email: 'a@b.c', lastActiveOrganizationId: 'club_123' });

    const { bootstrapMobileOrganization } = loadModule();

    await expect(bootstrapMobileOrganization()).resolves.toBe('club_123');
    expect(post).not.toHaveBeenCalled();
  });

  it('remembers the club on the stored user so the next cold start skips', async () => {
    getUser.mockReturnValue({ id: 'u1', email: 'a@b.c', lastActiveOrganizationId: null });
    post.mockResolvedValue({ data: {} });

    const { bootstrapMobileOrganization } = loadModule();

    await bootstrapMobileOrganization();
    expect(post).toHaveBeenCalledTimes(2);
    expect(setUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.c', lastActiveOrganizationId: 'club_123' });
  });
});
