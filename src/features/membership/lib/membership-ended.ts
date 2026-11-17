import { router } from 'expo-router';

/**
 * S17-02: member-content procedures refuse a lapsed member with oRPC
 * FORBIDDEN, whose OpenAPI body is
 * `{ defined, code: 'FORBIDDEN', status: 403, message, data: { reason: 'membership_inactive' } }`.
 */
export function isMembershipInactiveError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { data?: { reason?: unknown } } } } | null)?.response;
  return response?.status === 403 && response.data?.data?.reason === 'membership_inactive';
}

// The badge sync runs on every foreground; it fails quietly instead of
// reopening the screen each time the app comes back.
const BACKGROUND_POLLS = ['/api/inbox/badge-count'];

export function isBackgroundPoll(url: string | undefined): boolean {
  return !!url && BACKGROUND_POLLS.includes(url.split('?')[0]);
}

// One push per lapse: the many content queries that 403 together must not
// stack screens. The screen re-arms this on unmount.
let isOpen = false;

export function openMembershipEnded(): void {
  if (isOpen)
    return;
  isOpen = true;
  try {
    router.push('/membership-ended');
  }
  catch {
    // Navigator not mounted yet: re-arm so the next 403 tries again.
    isOpen = false;
  }
}

export function onMembershipEndedClosed(): void {
  isOpen = false;
}
