import * as React from 'react';

import { Text, View } from '@/components/ui';

export default function MoreScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold text-black dark:text-white">
        More
      </Text>
      <Text className="mt-2 text-center text-charcoal-500">
        Settings & account — coming soon
      </Text>
    </View>
  );
}
