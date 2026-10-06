import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '@/components/ui/colors';
import { translate } from '@/lib/i18n';

type CircleUnsupportedBlockProps = {
  type?: string;
};

function testIdPart(value: string): string {
  return value.replace(/[^\w-]/g, '-');
}

export function CircleUnsupportedBlock({ type }: CircleUnsupportedBlockProps) {
  const label = type?.trim() || 'unknown';
  return (
    <View
      testID={`circle-unsupported-${testIdPart(label)}`}
      accessibilityLabel={translate('community.media.unsupportedA11y', { type: label })}
      style={styles.container}
    >
      <Text style={styles.text}>{translate('community.media.unsupported', { type: label })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  text: {
    color: colors.inkVariant,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
