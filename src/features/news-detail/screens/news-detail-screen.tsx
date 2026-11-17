import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import {
  ErrorState,
  FocusAwareStatusBar,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { usePastHeader } from '@/components/ui/use-past-header';
import { ArticleContent } from '@/features/news-detail/components/article-content';
import { ArticleHero } from '@/features/news-detail/components/article-hero';
import { ArticleSkeleton } from '@/features/news-detail/components/article-skeleton';
import { useNewsPost } from '@/features/pulse/api/use-news-post';
import { translate } from '@/lib/i18n';
import { SkeletonSwap } from '@/lib/motion';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function NewsDetailScreen() {
  const params = useLocalSearchParams<{ 'news-post-id': string }>();
  const router = useRouter();
  const slug = params['news-post-id'];
  const { data: post, isLoading, isError, refetch, isRefetching } = useNewsPost(slug ?? '');
  const goBack = () => router.back();
  const { pastHeader, onHeaderHeight, onScroll } = usePastHeader();
  const failed = !isLoading && (isError || !post);
  // The hero (or its skeleton) is navy: light icons until it scrolls away.
  const overHero = !failed && !pastHeader;

  return (
    <View className="flex-1 bg-secondary-container">
      <Stack.Screen options={{ headerShown: false }} />
      <FocusAwareStatusBar barStyle={overHero ? 'light' : 'dark'} />
      {failed ? <ScreenHeader kicker={translate('news.kicker')} onBack={goBack} /> : null}
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="never" onScroll={onScroll} scrollEventThrottle={16}>
        <SkeletonSwap loading={isLoading} skeleton={<ArticleSkeleton onBack={goBack} />}>
          {post && !isError
            ? (
                <>
                  <ArticleHero
                    title={post.title}
                    imageUrl={post.featuredImageUrl}
                    dateLabel={formatDate(post.publishedAt)}
                    onBack={goBack}
                    onLayout={e => onHeaderHeight(e.nativeEvent.layout.height)}
                  />
                  <View className="gap-4 px-4 pt-6 pb-12">
                    {post.subtitle ? <Text variant="body-lg" className="text-ink-variant">{post.subtitle}</Text> : null}
                    {post.author?.name
                      ? <Text variant="body-sm" className="text-ink-muted">{translate('news.byline', { name: post.author.name })}</Text>
                      : null}
                    <ArticleContent html={post.contentHtml} />
                  </View>
                </>
              )
            : (
                <View className="px-4 pt-6">
                  <ErrorState
                    testID="news-error"
                    title={translate('news.notFoundTitle')}
                    body={translate('news.notFoundBody')}
                    onRetry={() => void refetch()}
                    retrying={isRefetching}
                  />
                </View>
              )}
        </SkeletonSwap>
      </ScrollView>
    </View>
  );
}
