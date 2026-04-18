import type { ReactNode } from 'react';

import { ActivityIndicator, Text, View } from '@/components/ui';

type TileWrapperProps = {
  title: string;
  isLoading: boolean;
  children: ReactNode;
};

export function TileWrapper({ title, isLoading, children }: TileWrapperProps) {
  return (
    <View className="overflow-hidden rounded-3xl bg-surface-container-lowest">
      <View className="px-6 pt-6 pb-2">
        <Text className="font-display text-3xl tracking-tight text-ink uppercase">
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
