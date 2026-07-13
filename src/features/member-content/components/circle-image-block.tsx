import type { DimensionValue } from 'react-native';
import type { HydratedNode } from '../tiptap/hydrate';

import { Image } from 'expo-image';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

type CircleImageBlockProps = {
  node: HydratedNode;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function imageWidth(value: unknown): DimensionValue {
  if (value === '50%' || value === '100%')
    return value;
  return '100%';
}

function imageAlignment(value: unknown) {
  if (value === 'left')
    return 'flex-start' as const;
  if (value === 'right')
    return 'flex-end' as const;
  return 'center' as const;
}

export function CircleImageBlock({ node }: CircleImageBlockProps) {
  const uri = nonEmptyString(node.attrs?.url) ?? nonEmptyString(node.attrs?.src);
  if (!uri)
    return null;

  const layoutStyle = {
    alignSelf: imageAlignment(node.attrs?.alignment),
    width: imageWidth(node.attrs?.width),
  };

  return (
    <View testID="circle-image" style={layoutStyle}>
      <Image
        testID="circle-image-content"
        accessibilityLabel={nonEmptyString(node.attrs?.alt) ?? undefined}
        cachePolicy="memory-disk"
        contentFit="contain"
        source={{ uri }}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    aspectRatio: 16 / 9,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    width: '100%',
  },
});
