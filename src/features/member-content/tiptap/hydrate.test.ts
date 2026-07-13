import { hydrateCircleDoc } from './hydrate';

describe('hydrateCircleDoc', () => {
  it('resolves nested sgid content into a self-contained document', () => {
    const input = {
      body: {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [{ type: 'embed', attrs: { sgid: 'embed-1' } }],
          },
        ],
      },
      sgids_to_object_map: {
        'embed-1': {
          html: '<iframe src="https://media.example/video"></iframe>',
          url: 'https://media.example/video',
        },
      },
    };

    const output = hydrateCircleDoc(input);

    expect(output?.content?.[0]?.content?.[0]?.attrs?._resolved).toEqual({
      html: '<iframe src="https://media.example/video"></iframe>',
      url: 'https://media.example/video',
    });
    expect(input.body.content[0].content[0].attrs).toEqual({ sgid: 'embed-1' });
  });

  it('resolves an image from inline attachments when the node has no URL', () => {
    const output = hydrateCircleDoc({
      body: {
        type: 'doc',
        content: [{ type: 'image', attrs: { signed_id: 'image-1' } }],
      },
      inline_attachments: [
        {
          signed_id: 'image-1',
          url: 'https://media.example/image.jpg',
        },
      ],
    });

    expect(output?.content?.[0]?.attrs).toMatchObject({
      signed_id: 'image-1',
      url: 'https://media.example/image.jpg',
      _resolved: {
        signed_id: 'image-1',
        url: 'https://media.example/image.jpg',
      },
    });
  });

  it('returns null when a nominal document contains no valid nodes', () => {
    expect(
      hydrateCircleDoc({
        body: { type: 'doc', content: [null, 42, 'not-a-node'] },
      }),
    ).toBeNull();
  });
});
