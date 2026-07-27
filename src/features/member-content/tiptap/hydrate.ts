import { resolveViaFor } from '@/features/member-content/tiptap/blocks';

export type CircleMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

export type HydratedNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: CircleMark[];
  content?: HydratedNode[];
};

type TiptapBody = {
  body?: unknown;
  sgids_to_object_map?: Record<string, unknown>;
  inline_attachments?: Array<Record<string, unknown>>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asNode(value: unknown): HydratedNode | null {
  const record = asRecord(value);
  return record ? record as HydratedNode : null;
}

export function hydrateCircleDoc(tiptapBody: unknown): HydratedNode | null {
  const body = asRecord(tiptapBody) as TiptapBody | null;
  const root = asNode(body?.body);
  if (!root || !Array.isArray(root.content) || root.content.length === 0) {
    return null;
  }

  const sgidMap = asRecord(body?.sgids_to_object_map) ?? {};
  const inlineAttachments = Array.isArray(body?.inline_attachments)
    ? body.inline_attachments.filter(
        (attachment): attachment is Record<string, unknown> => asRecord(attachment) !== null,
      )
    : [];

  const walk = (value: unknown): HydratedNode | null => {
    const node = asNode(value);
    if (!node)
      return null;

    let attrs = node.attrs;
    if (
      node.type
      && resolveViaFor(node.type) === 'sgid'
      && typeof node.attrs?.sgid === 'string'
    ) {
      const resolved = sgidMap[node.attrs.sgid];
      if (resolved !== undefined) {
        attrs = { ...node.attrs, _resolved: resolved };
      }
    }
    else if (node.type && resolveViaFor(node.type) === 'inlineAttachment') {
      const signedId = node.attrs?.signed_id;
      const attachment = typeof signedId === 'string'
        ? inlineAttachments.find(item => item.signed_id === signedId)
        : undefined;
      const url = node.attrs?.url ?? attachment?.url;
      if (url !== undefined) {
        attrs = {
          ...node.attrs,
          url,
          _resolved: attachment ?? null,
        };
      }
    }

    const content = Array.isArray(node.content)
      ? node.content.map(walk).filter((child): child is HydratedNode => child !== null)
      : undefined;

    return {
      ...node,
      ...(attrs === undefined ? {} : { attrs }),
      ...(content === undefined ? {} : { content }),
    };
  };

  const hydrated = walk(root);
  return hydrated?.content?.length ? hydrated : null;
}
