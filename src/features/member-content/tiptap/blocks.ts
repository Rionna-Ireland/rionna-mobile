export type CircleBlockKind = 'node' | 'mark';
export type CircleResolveVia = 'sgid' | 'inlineAttachment' | null;

export type CircleBlock = {
  type: string;
  kind: CircleBlockKind;
  authorable: boolean;
  resolvesVia: CircleResolveVia;
};

/**
 * Mobile copy of the framework-independent Circle block contract. Keep this
 * list aligned with packages/payments/lib/circle/blocks.ts in rionna-ireland.
 */
export const CIRCLE_BLOCKS: readonly CircleBlock[] = [
  { type: 'doc', kind: 'node', authorable: false, resolvesVia: null },
  { type: 'paragraph', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'heading', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'bulletList', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'orderedList', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'listItem', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'blockquote', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'codeBlock', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'horizontalRule', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'hardBreak', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'text', kind: 'node', authorable: true, resolvesVia: null },
  { type: 'image', kind: 'node', authorable: true, resolvesVia: 'inlineAttachment' },
  { type: 'embed', kind: 'node', authorable: true, resolvesVia: 'sgid' },
  { type: 'mention', kind: 'node', authorable: false, resolvesVia: 'sgid' },
  { type: 'poll', kind: 'node', authorable: false, resolvesVia: 'sgid' },
  { type: 'file', kind: 'node', authorable: false, resolvesVia: 'sgid' },
  { type: 'entity', kind: 'node', authorable: false, resolvesVia: null },
  { type: 'bold', kind: 'mark', authorable: true, resolvesVia: null },
  { type: 'italic', kind: 'mark', authorable: true, resolvesVia: null },
  { type: 'underline', kind: 'mark', authorable: true, resolvesVia: null },
  { type: 'strike', kind: 'mark', authorable: true, resolvesVia: null },
  { type: 'code', kind: 'mark', authorable: true, resolvesVia: null },
  { type: 'link', kind: 'mark', authorable: true, resolvesVia: null },
];

export const CIRCLE_DOWNCONVERT: Readonly<Record<string, string>> = {
  taskList: 'bulletList',
  taskItem: 'listItem',
};

const blocksByType = new Map(CIRCLE_BLOCKS.map(block => [block.type, block]));
const nodeTypes = new Set(
  CIRCLE_BLOCKS.filter(block => block.kind === 'node').map(block => block.type),
);

export function circleNodeTypes(): Set<string> {
  return new Set(nodeTypes);
}

export function isCircleNode(type: string): boolean {
  return nodeTypes.has(type);
}

export function isAuthorable(type: string): boolean {
  return blocksByType.get(type)?.authorable ?? false;
}

export function resolveViaFor(type: string): CircleResolveVia {
  return blocksByType.get(type)?.resolvesVia ?? null;
}
