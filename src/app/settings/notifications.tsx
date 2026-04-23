import type { UserPreferences } from '@/features/settings/api/use-preferences';
import * as React from 'react';

import { ActivityIndicator, Switch } from 'react-native';
import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import {
  usePreferences,
  useUpdatePreferences,
} from '@/features/settings/api/use-preferences';
import { translate } from '@/lib/i18n';

type Row = {
  labelKey: Parameters<typeof translate>[0];
  get: (prefs: UserPreferences) => boolean;
  set: (value: boolean) => Partial<UserPreferences>;
};

const PUSH_ROWS: Row[] = [
  {
    labelKey: 'settings.notifications.horseDeclared',
    get: p => p.pushPreferences.horseDeclared !== false,
    set: v => ({ pushPreferences: { horseDeclared: v } }),
  },
  {
    labelKey: 'settings.notifications.raceResult',
    get: p => p.pushPreferences.raceResult !== false,
    set: v => ({ pushPreferences: { raceResult: v } }),
  },
  {
    labelKey: 'settings.notifications.trainerPost',
    get: p => p.pushPreferences.trainerPost !== false,
    set: v => ({ pushPreferences: { trainerPost: v } }),
  },
  {
    labelKey: 'settings.notifications.newsPost',
    get: p => p.pushPreferences.newsPost !== false,
    set: v => ({ pushPreferences: { newsPost: v } }),
  },
];

const COMMUNITY_ROWS: Row[] = [
  {
    labelKey: 'settings.notifications.circleMention',
    get: p => p.pushPreferences.circleMention !== false,
    set: v => ({ pushPreferences: { circleMention: v } }),
  },
  {
    labelKey: 'settings.notifications.circleReply',
    get: p => p.pushPreferences.circleReply !== false,
    set: v => ({ pushPreferences: { circleReply: v } }),
  },
  {
    labelKey: 'settings.notifications.circleReaction',
    get: p => p.pushPreferences.circleReaction !== false,
    set: v => ({ pushPreferences: { circleReaction: v } }),
  },
  {
    labelKey: 'settings.notifications.circleDm',
    get: p => p.pushPreferences.circleDm !== false,
    set: v => ({ pushPreferences: { circleDm: v } }),
  },
  {
    labelKey: 'settings.notifications.circleHorseDiscussion',
    get: p => p.pushPreferences.circleHorseDiscussion !== false,
    set: v => ({ pushPreferences: { circleHorseDiscussion: v } }),
  },
];

const EMAIL_ROWS: Row[] = [
  {
    labelKey: 'settings.notifications.emailNewsPost',
    get: p => p.emailPreferences.newsPost !== false,
    set: v => ({ emailPreferences: { newsPost: v } }),
  },
];

export default function NotificationsScreen() {
  const { data, isLoading, isError } = usePreferences();
  const update = useUpdatePreferences();

  if (isLoading || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-center text-charcoal-500">
          Couldn't load preferences. Pull down or try again.
        </Text>
      </View>
    );
  }

  const pushMasterOn = data.pushEnabled;

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 bg-background">
        <View className="flex-1 px-4 pt-6 pb-10">
          <SectionLabel text="settings.notifications.enablePush" />
          <ToggleRow
            labelKey="settings.notifications.enablePush"
            value={pushMasterOn}
            onChange={v => update.mutate({ pushEnabled: v })}
          />

          <SectionLabel text="settings.notifications.whenSection" />
          {PUSH_ROWS.map(row => (
            <ToggleRow
              key={row.labelKey}
              labelKey={row.labelKey}
              value={pushMasterOn && row.get(data)}
              disabled={!pushMasterOn}
              onChange={v => update.mutate(row.set(v))}
            />
          ))}

          <SectionLabel text="settings.notifications.communitySection" />
          {COMMUNITY_ROWS.map(row => (
            <ToggleRow
              key={row.labelKey}
              labelKey={row.labelKey}
              value={pushMasterOn && row.get(data)}
              disabled={!pushMasterOn}
              onChange={v => update.mutate(row.set(v))}
            />
          ))}

          <SectionLabel text="settings.notifications.emailSection" />
          {EMAIL_ROWS.map(row => (
            <ToggleRow
              key={row.labelKey}
              labelKey={row.labelKey}
              value={row.get(data)}
              onChange={v => update.mutate(row.set(v))}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function SectionLabel({ text }: { text: Parameters<typeof translate>[0] }) {
  return (
    <Text className="pt-6 pb-2 text-sm font-medium text-neutral-500 uppercase">
      {translate(text)}
    </Text>
  );
}

function ToggleRow({
  labelKey,
  value,
  disabled,
  onChange,
}: {
  labelKey: Parameters<typeof translate>[0];
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="my-1 flex-row items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
      <Text
        className={
          disabled ? 'text-neutral-400' : 'text-black dark:text-white'
        }
      >
        {translate(labelKey)}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary?.[500] ?? '#D63384' }}
      />
    </View>
  );
}
