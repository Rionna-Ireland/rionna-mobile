import * as React from 'react';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, IconButton, Image, MonoLabel } from '@/components/ui';
import { CloseV2 } from '@/components/ui/icons/v2';
import { translate } from '@/lib/i18n';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/** Lets a post image ask the surrounding renderer to open the lightbox at its uri. */
export const OpenImageContext = React.createContext<((uri: string) => void) | null>(null);

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** One page: pinch or double-tap to zoom, drag to pan while zoomed. */
function ZoomableImage({ uri, width, height, onZoomChange }: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const [zoomed, setZoomed] = React.useState(false);

  const report = React.useCallback((next: boolean) => {
    setZoomed(next);
    onZoomChange(next);
  }, [onZoomChange]);

  const settle = (target: number) => {
    'worklet';
    const s = clamp(target, 1, MAX_SCALE);
    scale.value = withTiming(s);
    savedScale.value = s;
    // Keep the zoomed image covering the screen: pan is bounded by the overflow.
    const nx = s === 1 ? 0 : clamp(x.value, -(width * (s - 1)) / 2, (width * (s - 1)) / 2);
    const ny = s === 1 ? 0 : clamp(y.value, -(height * (s - 1)) / 2, (height * (s - 1)) / 2);
    x.value = withTiming(nx);
    y.value = withTiming(ny);
    savedX.value = nx;
    savedY.value = ny;
    scheduleOnRN(report, s > 1);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 0.8, MAX_SCALE);
    })
    .onEnd(() => settle(scale.value));

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(() => settle(savedScale.value));

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => settle(savedScale.value > 1 ? 1 : DOUBLE_TAP_SCALE));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan))}>
      <Animated.View style={[{ width, height }, style]}>
        <Image source={{ uri }} contentFit="contain" cachePolicy="memory-disk" style={{ width, height }} />
      </Animated.View>
    </GestureDetector>
  );
}

type ImageLightboxProps = {
  uris: string[];
  /** Index to open at; `null` keeps the lightbox closed. */
  index: number | null;
  onClose: () => void;
};

/** Full-screen viewer for a post's images: swipe between them, pinch or double-tap to zoom. */
export function ImageLightbox({ uris, index, onClose }: ImageLightboxProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = React.useState(index ?? 0);
  const [zoomed, setZoomed] = React.useState(false);

  React.useEffect(() => {
    if (index !== null) {
      setCurrent(index);
      setZoomed(false);
    }
  }, [index]);

  return (
    <Modal visible={index !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root} testID="image-lightbox">
        <FlatList
          data={uris}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <ZoomableImage uri={item} width={width} height={height} onZoomChange={setZoomed} />}
        />
        <View style={[styles.bar, { top: insets.top + 8 }]} pointerEvents="box-none">
          {uris.length > 1
            ? <MonoLabel tone="white" testID="image-lightbox-count">{`${current + 1} / ${uris.length}`}</MonoLabel>
            : <View />}
          <IconButton
            variant="circle"
            testID="image-lightbox-close"
            accessibilityLabel={translate('community.media.closeImage')}
            onPress={onClose}
          >
            <CloseV2 size={16} strokeWidth={2} />
          </IconButton>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
