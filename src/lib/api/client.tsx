import axios from 'axios';
import Env from 'env';
import { getAuthStatus, signOut } from '@/features/auth/use-auth-store';
import { getToken } from '@/lib/auth/utils';

function getApiOrigin() {
  try {
    return new URL(Env.EXPO_PUBLIC_API_URL).origin;
  }
  catch {
    return Env.EXPO_PUBLIC_API_URL;
  }
}

export const client = axios.create({
  baseURL: Env.EXPO_PUBLIC_API_URL,
});

// Attach auth token to every request
client.interceptors.request.use((config) => {
  config.headers.Origin = getApiOrigin();
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (session expired). Only tear down an established session —
// during login bootstrap status is still signOut, and a 401 on verify
// must not yank the token out from under the in-flight membership check
// (or from a concurrent Circle prewarm).
client.interceptors.response.use(
  response => response,
  (error) => {
    if (error.response?.status === 401 && getAuthStatus() === 'signIn') {
      void signOut();
    }
    return Promise.reject(error);
  },
);
