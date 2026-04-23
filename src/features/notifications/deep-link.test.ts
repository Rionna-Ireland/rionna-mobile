const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    navigate: mockNavigate,
    push: mockPush,
  },
}));

describe('notification deep links', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockPush.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds a fresh tap token for warm community notification reloads', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_234_567_890);

    let handleNotificationResponse!: (response: any) => void;
    jest.isolateModules(() => {
      ({ handleNotificationResponse } = require('./deep-link'));
    });

    handleNotificationResponse({
      notification: {
        request: {
          content: {
            data: {
              screen: 'community',
              url: 'https://community.rionna.club/c/test-horse/testing',
            },
          },
        },
      },
    } as any);

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/(app)/community',
      params: {
        url: 'https://community.rionna.club/c/test-horse/testing',
        notificationTap: '1234567890',
      },
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
