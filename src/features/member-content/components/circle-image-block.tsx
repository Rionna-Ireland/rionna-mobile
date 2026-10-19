import type { DimensionValue } from 'react-native';
import type { HydratedNode } from '@/features/member-content/tiptap/hydrate';

import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import colors from '@/components/ui/colors';
import { Image } from '@/components/ui/image';
import { MotionPressable } from '@/components/ui/pressable';
import { OpenImageContext } from '@/features/member-content/components/image-lightbox';
import { nonEmptyString } from '@/features/member-content/lib/content-format';
import { translate } from '@/lib/i18n';

type CircleImageBlockProps = {
  node: HydratedNode;
};

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

/** Uses the shared Image: cream placeholder + fade-in like every remote image (A-009). */
export function CircleImageBlock({ node }: CircleImageBlockProps) {
  const openImage = React.use(OpenImageContext);
  const uri = nonEmptyString(node.attrs?.url) ?? nonEmptyString(node.attrs?.src);
  if (!uri)
    return null;

  const layoutStyle = {
    alignSelf: imageAlignment(node.attrs?.alignment),
    width: imageWidth(node.attrs?.width),
  };

  const image = (
    <Image
      testID="circle-image-content"
      accessibilityLabel={nonEmptyString(node.attrs?.alt) ?? undefined}
      cachePolicy="memory-disk"
      contentFit="contain"
      source={{ uri }}
      style={styles.image}
    />
  );

  return (
    <View testID="circle-image" style={layoutStyle}>
      {openImage
        ? (
            <MotionPressable
              testID="circle-image-open"
              accessibilityRole="imagebutton"
              accessibilityLabel={translate('community.media.openImage')}
              onPress={() => openImage(uri)}
            >
              {image}
            </MotionPressable>
          )
        : image}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
    width: '100%',
  },
});
