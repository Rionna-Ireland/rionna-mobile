import Env from 'env';

import { client } from '@/lib/api/client';

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

  await client.post('/api/auth/organization/set-active', {
    organizationId: clubId,
  });

  try {
    await client.post('/api/auth/update-user', {
      lastActiveOrganizationId: clubId,
    });
  }
  catch (e) {
    console.warn('Failed to persist lastActiveOrganizationId during mobile bootstrap:', e);
  }

  return clubId;
}
