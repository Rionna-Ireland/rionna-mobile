import type { AuthUser } from '@/lib/auth/utils';
import { useForm } from '@tanstack/react-form';
import * as React from 'react';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import * as z from 'zod';

import { Button, Input, Text, View } from '@/components/ui';
import { getFieldError } from '@/components/ui/form-utils';
import { client } from '@/lib/api/client';

const schema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormProps = {
  onSuccess: (data: { token: string; user: AuthUser }) => void;
};

function FormHeader() {
  return (
    <View className="items-center justify-center">
      <Text
        testID="form-title"
        className="pb-2 text-center text-4xl font-bold text-black dark:text-white"
      >
        Pink Connections
      </Text>
      <Text className="mb-6 text-center text-charcoal-500">
        Sign in to your account
      </Text>
    </View>
  );
}

function FormFooter() {
  return (
    <View className="mt-8 items-center">
      <Text className="text-center text-sm text-charcoal-500">
        New members visit
        {' '}
        <Text className="font-bold text-black dark:text-white">
          pinkconnections.com
        </Text>
        {' '}
        to join.
      </Text>
    </View>
  );
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [error, setError] = React.useState<string | null>(null);

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
        onSuccess({ token, user });
      }
      catch (e: any) {
        const message
          = e.response?.data?.message
            ?? e.response?.data?.error
            ?? 'Sign in failed. Please check your credentials.';
        setError(message);
      }
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={10}
    >
      <View className="flex-1 justify-center p-4">
        <FormHeader />

        {error && (
          <View className="mb-4 rounded-lg bg-danger-50 p-3">
            <Text className="text-center text-sm text-black">{error}</Text>
          </View>
        )}

        <form.Field
          name="email"
          children={field => (
            <Input
              testID="email-input"
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
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
              testID="password-input"
              label="Password"
              placeholder="***"
              secureTextEntry={true}
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
              label="Sign In"
              onPress={form.handleSubmit}
              loading={isSubmitting}
            />
          )}
        />

        <FormFooter />
      </View>
    </KeyboardAvoidingView>
  );
}
