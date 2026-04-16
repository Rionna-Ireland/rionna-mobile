import type { ReactNode } from 'react';

import { ActivityIndicator, Text, View } from '@/components/ui';

type TileWrapperProps = {
  title: string;
  isLoading: boolean;
  children: ReactNode;
};

export function TileWrapper({ title, isLoading, children }: TileWrapperProps) {
  return (
    <View className="rounded-2xl bg-card shadow-md">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
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
