export const RICH_TEXT_TIPTAP_BODY = {
  body: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Racecourse update' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'The going is ' },
          { type: 'text', text: 'good', marks: [{ type: 'bold' }] },
          { type: 'text', text: ', not ' },
          { type: 'text', text: 'soft', marks: [{ type: 'strike' }] },
          { type: 'text', text: '. See the ' },
          {
            type: 'text',
            text: 'race card',
            marks: [
              { type: 'underline' },
              { type: 'link', attrs: { href: 'https://rionna.example/race-card' } },
            ],
          },
          { type: 'hardBreak' },
          { type: 'text', text: 'First race at 13:30.', marks: [{ type: 'italic' }] },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Travel early.' }],
          },
        ],
      },
      {
        type: 'orderedList',
        attrs: { start: 3 },
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Collect passes' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Meet at the parade ring' }],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Look for Rionna purple' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'codeBlock',
        content: [{ type: 'text', text: 'STALL 12', marks: [{ type: 'code' }] }],
      },
      { type: 'horizontalRule' },
    ],
  },
  sgids_to_object_map: {},
};

export const IMAGE_TIPTAP_BODY = {
  body: {
    type: 'doc',
    content: [
      {
        type: 'image',
        attrs: {
          signed_id: 'image-1',
          alignment: 'right',
          width: '50%',
          alt: 'Horse walking in the parade ring',
        },
      },
    ],
  },
  inline_attachments: [
    {
      signed_id: 'image-1',
      url: 'https://media.example/parade-ring.jpg',
      content_type: 'image/jpeg',
    },
  ],
};

export const EMBED_TIPTAP_BODY = {
  body: {
    type: 'doc',
    content: [{ type: 'embed', attrs: { sgid: 'embed-1' } }],
  },
  sgids_to_object_map: {
    'embed-1': {
      html: '<iframe src="https://media.example/live"></iframe>',
      url: 'https://media.example/live',
      embed_type: 'video',
    },
  },
};

export const UNSUPPORTED_TIPTAP_BODY = {
  body: {
    type: 'doc',
    content: [
      { type: 'poll', attrs: { sgid: 'poll-1' } },
      {
        type: 'futureContainer',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Readable future content' }],
          },
        ],
      },
      { type: 'futureLeaf' },
    ],
  },
  sgids_to_object_map: {
    'poll-1': { type: 'poll', title: 'Who will win?' },
  },
};
