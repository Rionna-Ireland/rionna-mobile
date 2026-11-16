import { Stack, useRouter } from 'expo-router';
import * as React from 'react';

import { Submark } from '@/components/brand/logo';
import { Button, colors, EmptyState, FocusAwareStatusBar, View } from '@/components/ui';
import { useScreenTopPadding } from '@/components/ui/screen-layout';
import { signOut } from '@/features/auth/use-auth-store';
import { onMembershipEndedClosed } from '@/features/membership/lib/membership-ended';

import { translate } from '@/lib/i18n';

/**
 * Shown once when a content request comes back `membership_inactive` (S17-02).
 * Keeps the member signed in: Profile (settings, membership status) and
 * sign-out stay one tap away. D9: no billing or re-subscribe UI in the app.
 */
export function MembershipEndedScreen() {
  const router = useRouter();
  const topPadding = useScreenTopPadding(48);

  React.useEffect(() => onMembershipEndedClosed, []);

  return (
    <View className="flex-1 gap-4 bg-secondary-container px-4" style={{ paddingTop: topPadding }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FocusAwareStatusBar />
      <View className="mb-2 items-center">
        <Submark width={48} color={colors.ink} />
      </View>
      <EmptyState
        testID="membership-ended"
        kicker={translate('membershipEnded.kicker')}
        title={translate('membershipEnded.title')}
        body={translate('membershipEnded.body')}
        actionLabel={translate('membershipEnded.profile')}
        onAction={() => router.push('/profile')}
      />
      <Button
        testID="membership-ended-sign-out"
        variant="secondary"
        label={translate('settings.profile.logout')}
        onPress={signOut}
      />
    </View>
  );
}
