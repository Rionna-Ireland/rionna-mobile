import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { MemberFeedItem } from '@/features/member-content/types';

import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Button, Card, Dots, MonoLabel, Text } from '@/components/ui';

const GUTTER = 16;
const GAP = 8;

type AnnouncementCarouselProps = {
  announcements: MemberFeedItem[];
  onOpen: (spaceId: string, postId: string) => void;
};

/**
 * Paged navy announcement cards (S13-06). Renders nothing when there are none.
 * Native snap; each card's dots track the scroll position (S14-02 §7).
 */
export function AnnouncementCarousel({ announcements, onOpen }: AnnouncementCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [index, setIndex] = React.useState(0);
  const slideWidth = windowWidth - GUTTER * 2;
  const step = slideWidth + GAP;
  const progress = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    progress.set(e.contentOffset.x / step);
  });

  const onScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / step));
    },
    [step],
  );

  if (announcements.length === 0) {
    return null;
  }
  const active = Math.min(index, announcements.length - 1);

  return (
    <View testID="announcement-carousel">
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP }}
      >
        {announcements.map(item => (
          <Card
            key={item.id}
            variant="navy"
            testID={`announcement-${item.id}`}
            className="justify-between gap-6 p-6"
            style={{ width: slideWidth, minHeight: 190 }}
          >
            <View className="gap-3">
              <MonoLabel tone="white">Announcement</MonoLabel>
              <Text variant="display-md" className="text-white" numberOfLines={4}>{item.title}</Text>
            </View>
            <View className="flex-row items-end justify-between">
              <Button
                variant="on-dark"
                size="md"
                fullWidth={false}
                label="Read"
                accessibilityLabel={`Read ${item.title}`}
                onPress={() => onOpen(item.spaceId!, item.id)}
              />
              {announcements.length > 1
                ? <Dots count={announcements.length} index={active} progress={progress} />
                : null}
            </View>
          </Card>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
