import type * as Notifications from 'expo-notifications';

import { router } from 'expo-router';

import { handleNotificationResponse } from '@/features/notifications/deep-link';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

function makeResponse(data: unknown): Notifications.NotificationResponse {
  return {
    notification: {
      request: {
        content: { data },
      },
    },
  } as unknown as Notifications.NotificationResponse;
}

describe('handleNotificationResponse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('routes horse pushes to the horse profile', () => {
    handleNotificationResponse(makeResponse({ screen: 'horse', horseId: 'h-1' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/stables/[horse-id]',
      params: { 'horse-id': 'h-1' },
    });
  });

  it('routes news pushes to the news post', () => {
    handleNotificationResponse(makeResponse({ screen: 'news', newsPostId: 'n-1' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/news/[news-post-id]',
      params: { 'news-post-id': 'n-1' },
    });
  });

  it('routes insideTrack pushes to /inside-track', () => {
    handleNotificationResponse(makeResponse({ screen: 'insideTrack' }));

    expect(router.push).toHaveBeenCalledWith('/inside-track');
  });

  it('still ignores unknown screens', () => {
    handleNotificationResponse(makeResponse({ screen: 'nope' }));

    expect(router.push).not.toHaveBeenCalled();
  });
});
