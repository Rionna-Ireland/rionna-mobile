import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import * as React from 'react';
import { Pressable, View } from 'react-native';

import {
  Horse as HorseIcon,
  Menu as MenuIcon,
  Pulse as PulseIcon,
  Users as UsersIcon,
} from '@/components/ui/icons';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className="absolute inset-x-6 bottom-6 flex-row items-center justify-between rounded-full bg-white/80 px-6 py-4 shadow-lg shadow-black/5">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        let Icon = PulseIcon;
        if (route.name === 'stables')
          Icon = HorseIcon;
        if (route.name === 'community')
          Icon = UsersIcon;
        if (route.name === 'more')
          Icon = MenuIcon;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            testID={options.tabBarButtonTestID}
            className={`items-center justify-center rounded-full p-3 ${isFocused ? 'bg-[#391d3a] shadow-md' : ''}`}
          >
            <Icon color={isFocused ? '#ffffff' : '#1c1c18'} />
          </Pressable>
        );
      })}
    </View>
  );
}
