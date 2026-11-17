import Env from 'env';

import { client } from '@/lib/api/client';
import { getUser, setUser } from '@/lib/auth/utils';

import { getClubMismatchMessage, verifyClubMembership } from './club-verification';

export class MobileOrganizationBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MobileOrganizationBootstrapError';
  }
}

export async function bootstrapMobileOrganization(options?: {
  verifyMembership?: boolean;
}) {
  const clubId = Env.EXPO_PUBLIC_CLUB_ID;

  if (!clubId) {
    return null;
  }

  if (options?.verifyMembership) {
    const isMember = await verifyClubMembership();
    if (!isMember) {
      throw new MobileOrganizationBootstrapError(getClubMismatchMessage());
    }
  }

  // M-16: already the member's org, and the backend's session-create hook makes
  // it every new session's active org, so there is nothing to write.
  const user = getUser();
  if (user?.lastActiveOrganizationId === clubId) {
    return clubId;
  }

  await client.post('/api/auth/organization/set-active', {
    organizationId: clubId,
  });

  try {
    await client.post('/api/auth/update-user', {
      lastActiveOrganizationId: clubId,
    });
    if (user)
      setUser({ ...user, lastActiveOrganizationId: clubId });
  }
  catch (e) {
    console.warn('Failed to persist lastActiveOrganizationId during mobile bootstrap:', e);
  }

  return clubId;
}
