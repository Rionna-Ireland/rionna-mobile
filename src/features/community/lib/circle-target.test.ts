describe('circle-target', () => {
  function loadModule() {
    let loaded: typeof import('./circle-target');
    jest.isolateModules(() => {
      loaded = require('./circle-target');
    });
    return loaded!;
  }

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_CIRCLE_MODE = 'mock_server';
    process.env.EXPO_PUBLIC_CIRCLE_MOCK_BASE_URL = 'http://localhost:5100';
  });

  it('normalizes absolute mock redirects into member-shell relative targets', () => {
    const { buildCommunitySessionUrl } = loadModule();

    const sessionUrl = buildCommunitySessionUrl({
      accessToken: 'mock-access-token-123',
      redirectUrl: 'http://localhost:5100/__mock/ui/member/posts/123?tab=latest',
    });

    expect(sessionUrl).toBeTruthy();
    const parsed = new URL(sessionUrl!);
    expect(parsed.searchParams.get('redirect')).toBe('/__mock/ui/member/posts/123?tab=latest');
  });

  it('returns the member shell as the default mock landing target', () => {
    const { getDefaultCommunityLandingUrl } = loadModule();

    expect(getDefaultCommunityLandingUrl()).toBe('http://localhost:5100/__mock/ui/member');
  });
});
