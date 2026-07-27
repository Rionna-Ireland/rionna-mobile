import { create } from 'zustand';

import { createSelectors } from '@/lib/utils';

/**
 * Visibility/lifecycle store for the persistent Community WebView singleton
 * (S6-05). The WebView is mounted ONCE at the app root (CommunityPanel in
 * _layout) and never unmounted by navigation — opening/closing Community only
 * toggles `visible` (opacity), so the Circle SPA stays warm and second-and-later
 * opens are instant.
 *
 * State that used to live in CommunityWebView component state (`bootstrapped`)
 * moves here so it is SESSION-scoped, not mount-scoped.
 *
 * Lifecycle:
 *  - `activated`: has Community been opened at least once this session? Controls
 *    whether the panel is mounted at all (no eager startup cost — first open
 *    cold-loads, the rest are instant).
 *  - `visible`: is the panel currently shown? Controls opacity/pointerEvents.
 *    Hiding NEVER unmounts (that would suspend the WK content process).
 *  - `reset()`: sign-out. The ONE case where destroying the WebView is correct
 *    (S6-04 cleared the cookies; the stale member-A DOM must go). Sets
 *    `activated=false` → panel unmounts → the next member's open mounts a fresh
 *    WebView with THEIR token (the token-bearing bootstrap script can't be
 *    swapped after mount on iOS, so a fresh mount is the clean reset).
 */
type CommunityPanelState = {
  activated: boolean;
  visible: boolean;
  /** Deep-link target (community path or absolute URL) awaiting the WebView. */
  pendingTarget: string | null;
  /** Session-scoped: the Circle SPA has booted + cookies installed. */
  bootstrapped: boolean;
  /** Open the panel, optionally with a deep-link target. */
  show: (target?: string | null) => void;
  /** Navigate away — hide only, stays mounted + warm. */
  hide: () => void;
  /** The WebView has consumed the deep-link target. */
  clearPendingTarget: () => void;
  setBootstrapped: (value: boolean) => void;
  /** Sign-out reset: unmount the panel and forget the session. */
  reset: () => void;
};

const _useCommunityPanelStore = create<CommunityPanelState>(set => ({
  activated: false,
  visible: false,
  pendingTarget: null,
  bootstrapped: false,
  show: target =>
    set(
      target != null
        ? { activated: true, visible: true, pendingTarget: target }
        : { activated: true, visible: true },
    ),
  hide: () => set({ visible: false }),
  clearPendingTarget: () => set({ pendingTarget: null }),
  setBootstrapped: value => set({ bootstrapped: value }),
  reset: () =>
    set({ activated: false, visible: false, pendingTarget: null, bootstrapped: false }),
}));

export const useCommunityPanelStore = createSelectors(_useCommunityPanelStore);

/** Reset the Community panel from outside React (the auth store on sign-out). */
export function resetCommunityPanel(): void {
  _useCommunityPanelStore.getState().reset();
}
