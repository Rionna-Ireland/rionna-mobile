import * as React from 'react';

import { StyleSheet } from 'react-native';

import {
  Card,
  ErrorState,
  FocusAwareStatusBar,
  ListRow,
  ScrollView,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
  Text,
  View,
} from '@/components/ui';
import {
  usePreferences,
  useUpdatePreferences,
} from '@/features/settings/api/use-preferences';
import { PageHeader } from '@/features/settings/components/page-header';
import { PreferenceSwitch } from '@/features/settings/components/preference-switch';
import { SettingsCard } from '@/features/settings/components/settings-card';
import { EMAIL_ROWS, PUSH_ROWS } from '@/features/settings/lib/notification-rows';
import { translate } from '@/lib/i18n';
import { SkeletonSwap } from '@/lib/motion';

type Preferences = NonNullable<ReturnType<typeof usePreferences>['data']>;

/** Mirrors the screen: the master switch card, then a titled card of switch rows (A-015). */
function PreferencesSkeleton() {
  const row = (divider: boolean, key: number) => (
    <View key={key} className={`min-h-11 flex-row items-center justify-between py-3 ${divider ? 'border-b border-outline-variant' : ''}`}>
      <SkeletonText variant="body-lg" width="55%" />
      <Skeleton width={51} height={31} radius={16} />
    </View>
  );
  return (
    <SkeletonGroup testID="preferences-loading" className="gap-4">
      <Card>{row(false, 0)}</Card>
      <Card>
        <SkeletonText variant="label-sm" width={96} className="mb-1" />
        {[0, 1, 2, 3].map(i => row(i < 3, i))}
      </Card>
    </SkeletonGroup>
  );
}

function PreferencesBody({ data, update }: { data: Preferences; update: ReturnType<typeof useUpdatePreferences> }) {
  const pushMasterOn = data.pushEnabled;
  return (
    <>
      <SettingsCard>
        <ListRow
          label={translate('settings.notifications.enablePush')}
          divider={false}
          accessory={(
            <PreferenceSwitch
              testID="pref-push-enabled"
              label={translate('settings.notifications.enablePush')}
              value={pushMasterOn}
              onValueChange={v => update.mutate({ pushEnabled: v })}
            />
          )}
        />
      </SettingsCard>

      <SettingsCard title={translate('settings.notifications.pushSection')}>
        <Text variant="body-sm" className="pb-1 text-ink-variant">
          {translate('settings.notifications.pushHelper')}
        </Text>
        {PUSH_ROWS.map((row, i) => (
          <ListRow
            key={row.labelKey}
            label={translate(row.labelKey)}
            divider={i < PUSH_ROWS.length - 1}
            accessory={(
              <PreferenceSwitch
                testID={`pref-${row.labelKey}`}
                label={translate(row.labelKey)}
                value={pushMasterOn && row.get(data)}
                disabled={!pushMasterOn}
                onValueChange={v => update.mutate(row.set(v))}
              />
            )}
          />
        ))}
      </SettingsCard>

      <SettingsCard title={translate('settings.notifications.emailSection')}>
        {EMAIL_ROWS.map((row, i) => (
          <ListRow
            key={row.labelKey}
            label={translate(row.labelKey)}
            divider={i < EMAIL_ROWS.length - 1}
            accessory={(
              <PreferenceSwitch
                testID={`pref-${row.labelKey}`}
                label={translate(row.labelKey)}
                value={row.get(data)}
                onValueChange={v => update.mutate(row.set(v))}
              />
            )}
          />
        ))}
      </SettingsCard>
    </>
  );
}

export function NotificationPreferencesScreen() {
  const query = usePreferences();
  const { data, isError, refetch, isRefetching } = query;
  const update = useUpdatePreferences();

  return (
    <View className="flex-1 bg-secondary-container">
      <FocusAwareStatusBar />
      <PageHeader kicker={translate('settings.notifications.title')} />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pt-6 pb-10">
        {isError && !data
          ? <ErrorState onRetry={() => void refetch()} retrying={isRefetching} />
          : (
              <SkeletonSwap loading={!data} skeleton={<PreferencesSkeleton />} style={styles.stack}>
                {data ? <PreferencesBody data={data} update={update} /> : null}
              </SkeletonSwap>
            )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 16 } });
