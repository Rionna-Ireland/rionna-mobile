import type { TextInput, TextInputProps } from 'react-native';
import { useForm } from '@tanstack/react-form';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import {
  Button,
  FocusAwareStatusBar,
  Input,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { getFieldError } from '@/components/ui/form-utils';
import { describeAuthError } from '@/features/auth/lib/auth-error';
import { PageHeader } from '@/features/settings/components/page-header';
import { client } from '@/lib/api/client';
import { translate } from '@/lib/i18n';

const schema = z
  .object({
    currentPassword: z.string().min(1, translate('auth.login.passwordRequired')),
    newPassword: z.string().min(8, translate('settings.changePassword.tooShort')),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: translate('settings.changePassword.mismatch'),
    path: ['confirmPassword'],
  });

type PasswordFieldProps = Pick<TextInputProps, 'returnKeyType' | 'onSubmitEditing' | 'submitBehavior'> & {
  form: any;
  name: 'currentPassword' | 'newPassword' | 'confirmPassword';
  labelKey: Parameters<typeof translate>[0];
  ref?: React.Ref<TextInput | null>;
};

/** iOS AutoFill: the current password fills in; the new ones get a strong-password suggestion (A-008). */
const AUTOFILL = {
  currentPassword: { autoComplete: 'current-password', textContentType: 'password' },
  newPassword: { autoComplete: 'new-password', textContentType: 'newPassword', passwordRules: 'minlength: 8;' },
  confirmPassword: { autoComplete: 'new-password', textContentType: 'newPassword', passwordRules: 'minlength: 8;' },
} as const satisfies Record<PasswordFieldProps['name'], TextInputProps>;

function PasswordField({ form, name, labelKey, ref, ...keyboard }: PasswordFieldProps) {
  return (
    <form.Field
      name={name}
      children={(field: any) => (
        <Input
          ref={ref}
          label={translate(labelKey)}
          secureTextEntry
          {...AUTOFILL[name]}
          {...keyboard}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChangeText={field.handleChange}
          error={getFieldError(field)}
        />
      )}
    />
  );
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const newRef = React.useRef<TextInput>(null);
  const confirmRef = React.useRef<TextInput>(null);

  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validators: { onChange: schema as any },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await client.post('/api/auth/change-password', {
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions: false,
        });
        setSuccess(true);
        setTimeout(() => router.back(), 800);
      }
      catch (e) {
        setError(describeAuthError(e, 'changePassword'));
      }
    },
  });

  return (
    <>
      <FocusAwareStatusBar />
      <View className="flex-1 bg-secondary-container">
        <PageHeader kicker={translate('settings.changePassword.title')} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="flex-1 px-4 pt-6 pb-10">
              {error && (
                <View className="mb-4 rounded-lg bg-white p-3">
                  <Text variant="body" className="text-center text-danger-700">{error}</Text>
                </View>
              )}

              {success && (
                <View className="mb-4 rounded-lg bg-white p-3">
                  <Text variant="body" className="text-center">
                    {translate('settings.changePassword.success')}
                  </Text>
                </View>
              )}

              <View>
                <PasswordField
                  form={form}
                  name="currentPassword"
                  labelKey="settings.changePassword.current"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => newRef.current?.focus()}
                />
                <PasswordField
                  ref={newRef}
                  form={form}
                  name="newPassword"
                  labelKey="settings.changePassword.new"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <PasswordField
                  ref={confirmRef}
                  form={form}
                  name="confirmPassword"
                  labelKey="settings.changePassword.confirm"
                  returnKeyType="go"
                  onSubmitEditing={() => void form.handleSubmit()}
                />
                <form.Subscribe
                  selector={state => [state.isSubmitting, state.canSubmit]}
                  children={([isSubmitting, canSubmit]) => (
                    <Button
                      label={translate('settings.changePassword.submit')}
                      onPress={form.handleSubmit}
                      loading={isSubmitting}
                      disabled={!canSubmit || isSubmitting}
                    />
                  )}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
