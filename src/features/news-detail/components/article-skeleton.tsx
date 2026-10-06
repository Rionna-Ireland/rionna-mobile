import * as React from 'react';

import { ScreenHeader, skeletonA11yProps, SkeletonGroup, SkeletonText, SkeletonTone, View } from '@/components/ui';
import { translate } from '@/lib/i18n';

/**
 * The article's first load (S14-08 A-015): the navy hero (with the real back
 * button) holding title and date bars, then the subtitle, byline and body
 * lines, on the article's own spacing so the crossfade moves nothing.
 */
export function ArticleSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <SkeletonGroup testID="news-loading" announce={false}>
      <View className="min-h-80 justify-between overflow-hidden bg-primary pb-6">
        <ScreenHeader kicker={translate('news.kicker')} tone="dark" onBack={onBack} />
        <SkeletonTone value="dark">
          <View className="gap-3 px-4 pt-16" {...skeletonA11yProps()}>
            <SkeletonText variant="display-lg" lines={2} />
            <SkeletonText variant="label" width={120} />
          </View>
        </SkeletonTone>
      </View>
      <View className="gap-4 px-4 pt-6 pb-12" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SkeletonText variant="body-lg" lines={2} />
        <SkeletonText variant="body-sm" width={96} />
        <SkeletonText variant="body" lines={6} />
      </View>
    </SkeletonGroup>
  );
}
