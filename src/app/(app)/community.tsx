import * as React from 'react';

import { Text, View } from '@/components/ui';

export default function CommunityScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold text-black dark:text-white">
        Community
      </Text>
      <Text className="mt-2 text-center text-charcoal-500">
        Connect with fellow members — coming soon
      </Text>
    </View>
  );
}
