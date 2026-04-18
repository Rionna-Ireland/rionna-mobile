import Env from 'env';

export type CircleMode = 'mock_service' | 'mock_server' | 'real';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizeMockRedirectTarget(target: string | undefined, baseUrl: string) {
  if (!target)
    return `${baseUrl}/__mock/ui/member`;

  if (target.startsWith('/'))
    return target;

  if (target.startsWith(baseUrl))
    return target.slice(baseUrl.length) || '/__mock/ui/member';

  return target;
}

export function getCircleMode(explicitMode?: string): CircleMode {
  if (
    explicitMode === 'mock_service'
    || explicitMode === 'mock_server'
    || explicitMode === 'real'
  ) {
    return explicitMode;
  }

  const envMode = Env.EXPO_PUBLIC_CIRCLE_MODE;
  if (
    envMode === 'mock_service'
    || envMode === 'mock_server'
    || envMode === 'real'
  ) {
    return envMode;
  }

  return Env.EXPO_PUBLIC_APP_ENV === 'production' ? 'real' : 'mock_server';
}

export function getCircleCommunityBaseUrl(
  explicitMode?: string,
  explicitBaseUrl?: string | null,
) {
  const mode = getCircleMode(explicitMode);
  if (mode === 'mock_server') {
    return normalizeBaseUrl(
      explicitBaseUrl
      || Env.EXPO_PUBLIC_CIRCLE_MOCK_BASE_URL
      || 'http://localhost:5100',
    );
  }

  if (explicitBaseUrl)
    return explicitBaseUrl;

  const domain = Env.EXPO_PUBLIC_COMMUNITY_DOMAIN;
  if (!domain)
    return null;
  return `https://${domain}`;
}

export function buildCommunityTargetUrl(input: {
  realPath: string;
  mockPath: string;
  explicitMode?: string;
  explicitBaseUrl?: string | null;
}) {
  const baseUrl = getCircleCommunityBaseUrl(input.explicitMode, input.explicitBaseUrl);
  if (!baseUrl)
    return null;

  return `${baseUrl}${getCircleMode(input.explicitMode) === 'mock_server' ? input.mockPath : input.realPath}`;
}

export function getDefaultCommunityLandingUrl(
  explicitMode?: string,
  explicitBaseUrl?: string | null,
) {
  return buildCommunityTargetUrl({
    realPath: '',
    mockPath: '/__mock/ui/member',
    explicitMode,
    explicitBaseUrl,
  });
}

export function buildCommunitySessionUrl(input: {
  accessToken: string;
  redirectUrl?: string;
  explicitMode?: string;
  explicitBaseUrl?: string | null;
}) {
  const mode = getCircleMode(input.explicitMode);
  const baseUrl = getCircleCommunityBaseUrl(input.explicitMode, input.explicitBaseUrl);
  if (!baseUrl)
    return null;

  if (mode === 'mock_server') {
    const redirectTarget = normalizeMockRedirectTarget(input.redirectUrl, baseUrl);
    return `${baseUrl}/__mock/ui/mobile-entry?access_token=${encodeURIComponent(input.accessToken)}&redirect=${encodeURIComponent(redirectTarget)}`;
  }

  const cookiesUrl = `${baseUrl}/session/cookies?access_token=${encodeURIComponent(input.accessToken)}`;
  return input.redirectUrl
    ? `${cookiesUrl}&redirect=${encodeURIComponent(input.redirectUrl)}`
    : cookiesUrl;
}
