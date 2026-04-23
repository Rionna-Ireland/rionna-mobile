import Env from 'env';
import { client } from '@/lib/api/client';

export async function verifyClubMembership(): Promise<boolean> {
  const clubId = Env.EXPO_PUBLIC_CLUB_ID;
  try {
    const response = await client.get('/api/organizations/verify-membership', {
      params: { organizationId: clubId },
    });
    return response.data.isMember === true;
  }
  catch {
    return false;
  }
}

export function getClubName(): string {
  return Env.EXPO_PUBLIC_CLUB_NAME;
}

export function getClubMismatchMessage(): string {
  const name = getClubName();
  return `This app is for ${name} members. Please check you're using the right app.`;
}
