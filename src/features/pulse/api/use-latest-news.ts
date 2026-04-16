import { useQuery } from '@tanstack/react-query';
import Env from 'env';

import { client } from '@/lib/api/client';

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  featuredImageUrl: string | null;
  publishedAt: string;
  author: { name: string } | null;
};

export function useLatestNews() {
  return useQuery({
    queryKey: ['latest-news', Env.EXPO_PUBLIC_CLUB_ID],
    queryFn: async () => {
      const { data } = await client.get('/api/news', {
        params: { organizationId: Env.EXPO_PUBLIC_CLUB_ID, limit: 3 },
      });
      return (data as { items: NewsItem[] }).items;
    },
    staleTime: 5 * 60 * 1000,
  });
}
