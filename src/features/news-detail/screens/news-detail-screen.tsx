import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

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
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { ArticleContent } from '@/features/news-detail/components/article-content';
import { ArticleHero } from '@/features/news-detail/components/article-hero';
import { ArticleSkeleton } from '@/features/news-detail/components/article-skeleton';
import { useNewsPost } from '@/features/pulse/api/use-news-post';
import { translate } from '@/lib/i18n';
import { SkeletonSwap } from '@/lib/motion';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Whether the navy hero has scrolled out from under the status bar (A-012),
 * like Horse detail's `pastHero`: white icons over the hero, dark once the
 * cream page sits under them. React state flips only when it changes.
 */
function usePastHeader() {
  const topInset = useScreenTopPadding(0);
  const heroHeight = React.useRef(0);
  const [pastHeader, setPastHeader] = React.useState(false);
  const onHeaderLayout = React.useCallback((event: LayoutChangeEvent) => {
    heroHeight.current = event.nativeEvent.layout.height;
  }, []);
  const onScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const height = heroHeight.current;
    const next = height > 0 && event.nativeEvent.contentOffset.y > height - topInset;
    setPastHeader(prev => (prev === next ? prev : next));
  }, [topInset]);
  return { pastHeader, onHeaderLayout, onScroll };
}

export function NewsDetailScreen() {
  const params = useLocalSearchParams<{ 'news-post-id': string }>();
  const router = useRouter();
  const slug = params['news-post-id'];
  const { data: post, isLoading, isError, refetch, isRefetching } = useNewsPost(slug ?? '');
  const goBack = () => router.back();
  const { pastHeader, onHeaderLayout, onScroll } = usePastHeader();
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
                    onLayout={onHeaderLayout}
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
