import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet } from 'react-native';

import { Gradient, Image, MonoLabel, ScreenHeader, Text, View } from '@/components/ui';
import { translate } from '@/lib/i18n';

type ArticleHeroProps = {
  title: string;
  imageUrl: string | null;
  dateLabel: string;
  onBack: () => void;
  /** The hero's layout (the screen flips the status bar once it scrolls away). */
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** Full-bleed hero: photo (cream pattern fallback) under a navy scrim, `display-lg` title, mono date. */
export function ArticleHero({ title, imageUrl, dateLabel, onBack, onLayout }: ArticleHeroProps) {
  return (
    <View testID="article-hero" onLayout={onLayout} className="min-h-80 justify-between overflow-hidden bg-primary pb-6">
      <Image
        source={imageUrl ? { uri: `${imageUrl}?width=1000&quality=80` } : null}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        fallback={{ colourway: 'cream' }}
        accessibilityIgnoresInvertColors
      />
      <Gradient variant="photo-scrim" pointerEvents="none" style={StyleSheet.absoluteFill} />
      <ScreenHeader kicker={translate('news.kicker')} tone="dark" onBack={onBack} />
      <View className="gap-3 px-4 pt-16">
        <Text variant="display-lg" accessibilityRole="header" className="text-white">{title}</Text>
        <MonoLabel tone="white">{dateLabel}</MonoLabel>
      </View>
    </View>
  );
}
