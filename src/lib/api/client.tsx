import axios from 'axios';
import Env from 'env';
import { getAuthStatus, getAuthToken, signOut } from '@/features/auth/use-auth-store';
import { isBackgroundPoll, isMembershipInactiveError, openMembershipEnded } from '@/features/membership/lib/membership-ended';

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
  // M-07: RN Android has no default timeout, so a dead connection spins forever.
  timeout: 15000,
});

// Attach auth token to every request
client.interceptors.request.use((config) => {
  config.headers.Origin = getApiOrigin();
  const token = getAuthToken();
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
    // Only for the current token: a late 401 for a replaced one (password
    // change, account switch) must not end the new session.
    const sentToken = error.config?.headers?.Authorization;
    if (error.response?.status === 401 && getAuthStatus() === 'signIn' && sentToken === `Bearer ${getAuthToken()}`) {
      void signOut();
    }
    // S17-02: a lapsed member stays signed in; route once instead of per-screen errors.
    if (isMembershipInactiveError(error) && !isBackgroundPoll(error.config?.url) && getAuthStatus() === 'signIn') {
      openMembershipEnded();
    }
    return Promise.reject(error);
  },
);
