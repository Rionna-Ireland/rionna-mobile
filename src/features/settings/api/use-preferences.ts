import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/api/client';

export type PushPreferences = {
  horseDeclared?: boolean;
  raceResult?: boolean;
  trainerPost?: boolean;
  newsPost?: boolean;
};

export type EmailPreferences = {
  newsPost?: boolean;
};

export type UserPreferences = {
  pushEnabled: boolean;
  pushPreferences: PushPreferences;
  emailPreferences: EmailPreferences;
};

const QUERY_KEY = ['user', 'preferences'];

export function usePreferences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await client.get('/api/users/preferences');
      return data as UserPreferences;
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<UserPreferences>) => {
      const { data } = await client.put('/api/users/preferences', input);
      return data as UserPreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
