const ORIGINAL_ENV = process.env;

function loadEnv(vars: Record<string, string>) {
  process.env = { ...ORIGINAL_ENV, ...vars };
  let env: unknown;
  jest.isolateModules(() => {
    env = require('./env').default;
  });
  return env as { EXPO_PUBLIC_API_URL: string };
}

describe('env production guard (M-10)', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws for production with an http API URL', () => {
    expect(() => loadEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_URL: 'http://localhost:3000' }))
      .toThrow(/https/);
  });

  it('accepts production with an https API URL', () => {
    expect(loadEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_URL: 'https://app.rionna.com' }).EXPO_PUBLIC_API_URL)
      .toBe('https://app.rionna.com');
  });

  it('allows http outside production', () => {
    expect(() => loadEnv({ EXPO_PUBLIC_APP_ENV: 'development', EXPO_PUBLIC_API_URL: 'http://localhost:3000' }))
      .not
      .toThrow();
  });
});
