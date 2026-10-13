import { storyHref } from './story-href';

const base = { id: 'x', title: 't', subtitle: null, featuredImageUrl: null, publishedAt: '2026-08-01T00:00:00.000Z' };

describe('storyHref', () => {
  it('routes news stories to /news/{slug}', () => {
    expect(storyHref({ ...base, source: 'news', slug: 'six-horses' })).toBe('/news/six-horses');
  });

  it('treats a story without a source as news (older backend)', () => {
    expect(storyHref({ ...base, slug: 'six-horses' })).toBe('/news/six-horses');
  });

  it('routes circle stories to the post thread', () => {
    expect(storyHref({ ...base, source: 'circle', slug: null, spaceId: '2695471', postId: '77' })).toBe('/post/2695471/77');
  });
});
