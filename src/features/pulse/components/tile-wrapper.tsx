import type { ReactNode } from 'react';

import { ActivityIndicator, Text, View } from '@/components/ui';

type TileWrapperProps = {
  title: string;
  isLoading: boolean;
  children: ReactNode;
};

export function TileWrapper({ title, isLoading, children }: TileWrapperProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <View className="px-4 pt-4 pb-2">
        <Text className="font-display text-2xl text-black">
          {title}
        </Text>
      </View>
      {isLoading
        ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
            </View>
          )
        : (
            children
          )}
    </View>
  );
}
