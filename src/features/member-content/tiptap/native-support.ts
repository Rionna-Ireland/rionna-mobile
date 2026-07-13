import type { HydratedNode } from './hydrate';

export type CircleNativeNodeSupport = 'native' | 'webview' | 'placeholder';

/**
 * Deliberate capability map. Its coverage test fails when the duplicated Circle
 * registry gains a node without a native rendering decision.
 */
export const CIRCLE_NATIVE_NODE_SUPPORT = {
  doc: 'native',
  paragraph: 'native',
  heading: 'native',
  bulletList: 'native',
  orderedList: 'native',
  listItem: 'native',
  blockquote: 'native',
  codeBlock: 'native',
  horizontalRule: 'native',
  hardBreak: 'native',
  text: 'native',
  image: 'native',
  embed: 'webview',
  mention: 'placeholder',
  poll: 'placeholder',
  file: 'placeholder',
  entity: 'placeholder',
} as const satisfies Record<string, CircleNativeNodeSupport>;

export function circleDocHasContent(doc: unknown): doc is HydratedNode {
  return Boolean(
    doc
    && typeof doc === 'object'
    && Array.isArray((doc as HydratedNode).content)
    && (doc as HydratedNode).content!.length > 0,
  );
}
