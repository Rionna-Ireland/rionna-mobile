import { getItem, setItem } from '@/lib/storage';

/**
 * "Has seen the welcome" per member (S14-04 §6): the full welcome + pattern
 * wave plays on a member's first sign-in on this device only. Storage is read
 * lazily, inside the calls, never at module load.
 */

const KEY_PREFIX = 'arrival.welcomeSeen.v1.';

export function welcomeKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function hasSeenWelcome(userId: string | null | undefined): boolean {
  if (!userId)
    return false;
  try {
    return getItem<boolean>(welcomeKey(userId)) === true;
  }
  catch {
    return false;
  }
}

export function markWelcomeSeen(userId: string | null | undefined): void {
  if (!userId)
    return;
  try {
    void setItem(welcomeKey(userId), true);
  }
  catch {}
}
