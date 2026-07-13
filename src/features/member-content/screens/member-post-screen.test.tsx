import type { MemberPostDetail } from '@/features/member-content/types';

import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { MemberPostView } from './member-post-screen';

jest.mock('@/components/ui', () => ({
  Image: 'Image',
}));

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

const POST: MemberPostDetail = {
  id: 'post-1',
  spaceId: 'space-1',
  title: 'Laska morning update',
  bodyHtml: null,
  bodyText: 'Plain text fallback',
  imageUrl: null,
  tiptapDoc: {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Native rich content' }],
    }],
  },
  embeds: {},
  inlineAttachments: [],
  authorName: 'Rionna Racing',
  authorAvatarUrl: null,
  spaceName: 'Laska',
  createdAt: '2026-07-13T08:00:00.000Z',
  commentCount: 2,
  likeCount: 5,
  url: null,
};

describe('memberPostView', () => {
  it('renders hydrated TipTap content natively with read-only counts', () => {
    render(<MemberPostView post={POST} contentState="fresh" />);

    expect(screen.getByText('Native rich content')).toBeOnTheScreen();
    expect(screen.queryByText('Plain text fallback')).not.toBeOnTheScreen();
    expect(screen.getByText('5 likes')).toBeOnTheScreen();
    expect(screen.getByText('2 comments')).toBeOnTheScreen();
  });

  it('falls back to body text when the TipTap document is unusable', () => {
    render(
      <MemberPostView
        post={{ ...POST, tiptapDoc: null, bodyText: 'Readable saved update' }}
        contentState="saved"
      />,
    );

    expect(screen.getByText('Showing saved content')).toBeOnTheScreen();
    expect(screen.getByText('Readable saved update')).toBeOnTheScreen();
  });

  it.each(['loading', 'unavailable'] as const)('renders the %s state', (state) => {
    render(
      <MemberPostView
        post={undefined}
        contentState={state === 'loading' ? 'unavailable' : state}
        isLoading={state === 'loading'}
      />,
    );
    expect(screen.getByTestId(`member-post-${state}`)).toBeOnTheScreen();
  });
});
