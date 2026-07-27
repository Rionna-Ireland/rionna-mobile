import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
      accessibilityLabel={`Unsupported Circle content: ${label}`}
      style={styles.container}
    >
      <Text style={styles.text}>{`Unsupported content: ${label}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F2',
    borderColor: '#D9D9D9',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  text: {
    color: '#6B6B6B',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
