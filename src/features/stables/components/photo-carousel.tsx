import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Image } from '@/components/ui';

type Photo = { url: string; caption?: string };

function Dots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View
      testID="photo-carousel-dots"
      className="absolute inset-x-0 bottom-3 flex-row items-center justify-center gap-1.5"
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          testID={`photo-carousel-dot-${index}`}
          className={`size-1.5 rounded-full ${
            index === activeIndex ? 'bg-white' : 'bg-white/40'
          }`}
        />
      ))}
    </View>
  );
}

/**
 * Swipable photo pager for the horse hero. One photo renders statically;
 * several page horizontally with a dot indicator. Fills its parent, so wrap
 * it in the aspect/rounded container.
 */
export function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const [width, setWidth] = React.useState(0);
  const [activeIndex, setActiveIndex] = React.useState(0);

  if (photos.length === 0) {
    return <View testID="photo-carousel-placeholder" className="flex-1 bg-muted" />;
  }

  if (photos.length === 1) {
    return (
      <Image
        source={{ uri: `${photos[0].url}?width=800&quality=80` }}
        className="size-full"
        contentFit="cover"
      />
    );
  }

  return (
    <View
      testID="photo-carousel"
      className="size-full"
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          if (width > 0) {
            setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
          }
        }}
      >
        {photos.map(photo => (
          <View key={photo.url} style={{ width: width || undefined }} className="h-full">
            <Image
              source={{ uri: `${photo.url}?width=800&quality=80` }}
              className="size-full"
              contentFit="cover"
            />
          </View>
        ))}
      </ScrollView>
      <Dots count={photos.length} activeIndex={activeIndex} />
    </View>
  );
}
