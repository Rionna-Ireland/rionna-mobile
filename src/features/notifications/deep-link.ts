import type * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

type PushData
  = | { screen: 'horse'; horseId: string }
    | { screen: 'news'; newsPostId: string }
    | { screen: 'community'; url?: string };

function isPushData(data: unknown): data is PushData {
  if (!data || typeof data !== 'object')
    return false;
  const d = data as Record<string, unknown>;
  if (d.screen === 'horse')
    return typeof d.horseId === 'string';
  if (d.screen === 'news')
    return typeof d.newsPostId === 'string';
  if (d.screen === 'community')
    return d.url === undefined || typeof d.url === 'string';
  return false;
}

export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): void {
  const data = response.notification.request.content.data;
  if (!isPushData(data))
    return;

  switch (data.screen) {
    case 'horse':
      router.push({
        pathname: '/stables/[horse-id]',
        params: { 'horse-id': data.horseId },
      });
      return;
    case 'news':
      router.push({
        pathname: '/news/[news-post-id]',
        params: { 'news-post-id': data.newsPostId },
      });
      return;
    case 'community':
      router.push({
        pathname: '/community-view',
        params: data.url ? { url: data.url } : {},
      });
  }
}
