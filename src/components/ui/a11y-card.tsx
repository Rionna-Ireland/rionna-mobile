import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';

/**
 * A control nested inside a tappable card (S14-08 A-004). On iOS an
 * accessible wrapper is a single VoiceOver element that hides its
 * descendants, so a Follow / RSVP / Like button inside a card can't be
 * focused. The pattern: the card keeps one element with a full summary
 * label (`cardA11yLabel`) and its default activation still opens the card;
 * every nested control is also exposed as a custom action (VoiceOver's
 * Actions rotor, TalkBack's actions menu) via `cardA11yActions`.
 */
export type CardA11yAction = {
  /** Stable action name, e.g. `follow`, `rsvp`, `remind`, `like`, `delete`. */
  name: string;
  /** What VoiceOver announces, e.g. "Follow", "Cancel RSVP". */
  label: string;
  /** Same handler the visible control runs. */
  onActivate: () => void;
  /** Omitted from the rotor while disabled (e.g. a full event, a pending mutation). */
  disabled?: boolean;
};

type MaybeAction = CardA11yAction | null | undefined | false;

/** Joins the card's facts into one VoiceOver summary, skipping blanks. */
export function cardA11yLabel(parts: ReadonlyArray<string | null | undefined | false>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join(', ');
}

/**
 * Props for the card wrapper: spread onto the tappable element (`Card
 * onPress`, `MotionPressable`). Returns nothing when there are no actions,
 * so the wrapper's props stay unchanged.
 */
export function cardA11yActions(actions: ReadonlyArray<MaybeAction>): {
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
} {
  const enabled = actions.filter((a): a is CardA11yAction => Boolean(a) && !(a as CardA11yAction).disabled);
  if (enabled.length === 0)
    return {};
  return {
    accessibilityActions: enabled.map(a => ({ name: a.name, label: a.label })),
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      enabled.find(a => a.name === event.nativeEvent.actionName)?.onActivate();
    },
  };
}
