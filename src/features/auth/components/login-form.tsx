import type { TextInput } from 'react-native';
import type { AuthUser } from '@/lib/auth/utils';
import { useForm } from '@tanstack/react-form';
import Env from 'env';
import * as React from 'react';
import { Keyboard, ScrollView, useWindowDimensions } from 'react-native';

import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import { Submark } from '@/components/brand/logo';
import { Button, colors, Input, minHitSlop, MotionPressable, Text, View } from '@/components/ui';
import { getFieldError } from '@/components/ui/form-utils';
import { ArrivalSlot } from '@/features/arrival/arrival-slot';
import { LoginMedia } from '@/features/arrival/login-media';
import { describeAuthError } from '@/features/auth/lib/auth-error';
import { client } from '@/lib/api/client';
import { translate } from '@/lib/i18n';
import { openExternalLink } from '@/lib/open-external-link';

const schema = z.object({
  email: z
    .string({ message: translate('auth.login.emailRequired') })
    .min(1, translate('auth.login.emailRequired'))
    .email(translate('auth.login.emailInvalid')),
  password: z
    .string({ message: translate('auth.login.passwordRequired') })
    .min(1, translate('auth.login.passwordRequired'))
    .min(6, translate('auth.login.passwordTooShort')),
});

export type LoginFormProps = {
  onSuccess: (data: { token: string; user: AuthUser }) => Promise<void> | void;
};

function apiHost(): string {
  try {
    return new URL(Env.EXPO_PUBLIC_API_URL).host;
  }
  catch {
    return Env.EXPO_PUBLIC_API_URL;
  }
}

const POSTER = require('../../../../assets/login-poster.jpg');

const SHORT_SCREEN_HEIGHT = 700;
const MARKETING_URL = 'https://rionna.com';

/** Forgot-password lives on the web app, at the API/auth origin. */
export function forgotPasswordUrl(apiUrl: string = Env.EXPO_PUBLIC_API_URL): string {
  try {
    return `${new URL(apiUrl).origin}/forgot-password`;
  }
  catch {
    return `${apiUrl.replace(/\/+$/, '')}/forgot-password`;
  }
}

/** True while the software keyboard is up. */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const subs = [
      Keyboard.addListener('keyboardDidShow', () => setVisible(true)),
      Keyboard.addListener('keyboardDidHide', () => setVisible(false)),
    ];
    return () => subs.forEach(sub => sub.remove());
  }, []);
  return visible;
}

function FormHeader() {
  const showHost = Env.EXPO_PUBLIC_APP_ENV !== 'production';
  return (
    <View className="items-center">
      <ArrivalSlot name="login" testID="login-brand-slot">
        <Submark width={52} color={colors.secondaryContainer} />
      </ArrivalSlot>
      <Text
        testID="form-title"
        variant="display-xl"
        className="mt-6 text-center text-secondary-container"
      >
        <Text variant="display-xl" className="text-on-primary-container">{translate('auth.login.titleLead')}</Text>
        {translate('auth.login.titleRest')}
      </Text>
      <Text
        variant="body"
        className="mt-6 text-center font-sans-medium text-on-primary-container"
      >
        {translate('auth.login.welcome')}
      </Text>
      {showHost && (
        <Text
          testID="api-host"
          variant="body-sm"
          className="mt-1 text-center text-on-primary-container opacity-60"
        >
          {apiHost()}
        </Text>
      )}
    </View>
  );
}

/** Body-sm line height: the links' hitSlop grows them to 44pt (A-040). */
const LINK_HEIGHT = 16;

function FormFooter() {
  return (
    <View className="mt-4 items-center gap-2">
      <MotionPressable
        size="small"
        testID="forgot-password-link"
        accessibilityRole="link"
        hitSlop={minHitSlop(LINK_HEIGHT)}
        onPress={() => openExternalLink(forgotPasswordUrl())}
      >
        <Text variant="body-sm" className="font-sans-medium text-on-primary-container">
          {translate('auth.login.forgotPassword')}
        </Text>
      </MotionPressable>
      <View className="flex-row items-center">
        <Text variant="body-sm" className="font-sans-medium text-white">
          {translate('auth.login.noAccount')}
        </Text>
        <MotionPressable
          size="small"
          testID="signup-link"
          accessibilityRole="link"
          hitSlop={minHitSlop(LINK_HEIGHT)}
          onPress={() => openExternalLink(MARKETING_URL)}
        >
          <Text variant="body-sm" className="font-sans-medium text-on-primary-container">
            {translate('auth.login.signUpLink')}
          </Text>
        </MotionPressable>
      </View>
    </View>
  );
}

function LoginError({ error }: { error: string | null }) {
  if (!error)
    return null;
  return (
    <Text
      testID="login-error"
      accessibilityRole="alert"
      variant="body-sm"
      className="mb-2 text-center font-sans-medium text-on-primary-container"
    >
      {error}
    </Text>
  );
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const keyboardVisible = useKeyboardVisible();
  const { height } = useWindowDimensions();
  const collapseMedia = keyboardVisible && height < SHORT_SCREEN_HEIGHT;

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: schema as any },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const response = await client.post('/api/auth/sign-in/email', {
          email: value.email,
          password: value.password,
        });
        const { token, user } = response.data;
        await onSuccess({ token, user });
      }
      catch (e: any) {
        setError(describeAuthError(e, 'signIn'));
      }
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={10}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow items-center justify-center gap-8 px-8 py-[60px]"
      >
        <FormHeader />

        {!collapseMedia && <LoginMedia poster={POSTER} />}

        <View className="w-full">
          <LoginError error={error} />

          <form.Field
            name="email"
            children={field => (
              <Input
                testID="email-input"
                tone="dark"
                accessibilityLabel={translate('auth.login.email')}
                placeholder={translate('auth.login.email')}
                autoCapitalize="none"
                autoComplete="email"
                // "username" pairs the field with the password for iOS AutoFill (A-008).
                textContentType="username"
                keyboardType="email-address"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="password"
            children={field => (
              <Input
                ref={passwordRef}
                testID="password-input"
                tone="dark"
                accessibilityLabel={translate('auth.login.password')}
                placeholder={translate('auth.login.password')}
                secureTextEntry={true}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void form.handleSubmit()}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Subscribe
            selector={state => [state.isSubmitting]}
            children={([isSubmitting]) => (
              <Button
                testID="login-button"
                label={translate('auth.login.submit')}
                variant="on-dark"
                onPress={form.handleSubmit}
                loading={isSubmitting}
              />
            )}
          />

          <FormFooter />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
