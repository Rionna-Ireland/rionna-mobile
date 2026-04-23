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

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_CLUB_ID = 'club_123';

    post.mockReset();
    verifyClubMembership.mockReset();

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
});
