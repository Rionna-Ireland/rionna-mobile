import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  featuredImageUrl: string | null;
  contentHtml: string;
  publishedAt: string;
  author: { name: string } | null;
};

export function useNewsPost(slug: string) {
  return useQuery({
    queryKey: ['news-post', slug],
    queryFn: async () => {
      const { data } = await client.get(`/api/news/${slug}`, {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID },
      });
      return data as NewsPost;
    },
    enabled: !!slug,
  });
}
