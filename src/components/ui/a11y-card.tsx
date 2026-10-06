import type { AccessibilityActionEvent, AccessibilityProps } from 'react-native';

/**
 * Screen-reader structure for a tappable card that holds its own controls
 * (S14-08 A-004).
 *
 * On iOS an accessible wrapper hides every descendant from VoiceOver, so a
 * nested Like / Delete / Follow button can't be reached by swiping. The card
 * stays one element, the way a sighted member reads it, with:
 *
 * - a full summary label (`a11ySummary`: author, space, time, title, counts);
 * - each nested control as a custom action (VoiceOver's Actions rotor,
 *   TalkBack's actions menu), so every intent stays reachable;
 * - double-tap still runs the card's own `onPress` (open).
 */
export type A11yCardAction = {
  /** Stable action id, e.g. `like`, `delete`, `report`. */
  name: string;
  /** What the screen reader announces, e.g. "Like" or "Delete comment". */
  label: string;
  onAction: () => void;
};

type MaybeAction = A11yCardAction | null | undefined | false;

/** Joins the non-empty parts with ", " (the screen-reader pause). */
export function a11ySummary(parts: Array<string | null | undefined | false>): string {
  return parts
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

/** Spread onto the card's pressable: one accessible element plus its nested intents as actions. */
export function a11yCardProps({ label, actions = [] }: { label: string; actions?: MaybeAction[] }): AccessibilityProps {
  const list = actions.filter((action): action is A11yCardAction => Boolean(action));
  if (list.length === 0)
    return { accessible: true, accessibilityLabel: label };
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityActions: list.map(({ name, label: actionLabel }) => ({ name, label: actionLabel })),
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      list.find(action => action.name === event.nativeEvent.actionName)?.onAction();
    },
  };
}
