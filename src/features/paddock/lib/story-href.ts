import type { CharityStoryTeaser } from '@/features/paddock/types';

/** News stories open the article; Charity Impact (Circle) stories open the post thread. */
export function storyHref(story: CharityStoryTeaser): `/post/${string}/${string}` | `/news/${string}` {
  if (story.source === 'circle' && story.spaceId && story.postId)
    return `/post/${encodeURIComponent(story.spaceId)}/${encodeURIComponent(story.postId)}`;
  return `/news/${story.slug ?? ''}`;
}
