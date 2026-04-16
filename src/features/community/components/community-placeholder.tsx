import * as React from 'react';

import { Text, View } from '@/components/ui';

type Props = {
  message?: string;
};

export function CommunityPlaceholder({ message }: Props) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-2xl font-bold text-foreground">Community</Text>
      <Text className="mt-3 text-center text-charcoal-500">
        {message ?? 'The community is being set up. Check back soon!'}
      </Text>
    </View>
  );
}
