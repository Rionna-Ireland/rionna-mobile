import type { PickedMedia } from '@/features/community-posting/types';

import { validateMedia } from '@/features/community-posting/lib/pick-media';

function photo(over: Partial<PickedMedia> = {}): PickedMedia {
  return {
    uri: 'file:///a.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    fileName: 'a.jpg',
    fileSize: 1000,
    ...over,
  };
}
function video(over: Partial<PickedMedia> = {}): PickedMedia {
  return photo({ kind: 'video', mimeType: 'video/mp4', fileName: 'a.mp4', ...over });
}

describe('validateMedia', () => {
  it('accepts valid photos and a video', () => {
    const items = [photo(), video()];
    expect(validateMedia(items, [])).toEqual({ items, error: null });
  });

  it('rejects unsupported types', () => {
    const res = validateMedia([photo({ mimeType: 'image/gif' }), video({ mimeType: 'video/webm' })], []);
    expect(res.items).toEqual([]);
    expect(res.error).toMatch(/isn't supported/);
  });

  it('rejects an image over 10 MB and a video over 200 MB', () => {
    expect(validateMedia([photo({ fileSize: 10 * 1024 * 1024 + 1 })], []).error).toBe('Photos must be under 10 MB.');
    expect(validateMedia([video({ fileSize: 200 * 1024 * 1024 + 1 })], []).error).toBe('Videos must be under 200 MB.');
    expect(validateMedia([video({ fileSize: 200 * 1024 * 1024 })], []).items).toHaveLength(1);
  });

  it('caps photos at 6 and videos at 1 including existing items', () => {
    const six = Array.from({ length: 6 }, () => photo());
    const res = validateMedia([photo()], six);
    expect(res.items).toEqual([]);
    expect(res.error).toBe('You can add up to 6 photos.');

    const two = validateMedia([video(), video()], []);
    expect(two.items).toHaveLength(1);
    expect(two.error).toBe('You can add one video per post.');
    expect(validateMedia([video()], [video()]).items).toEqual([]);
  });

  it('keeps valid items alongside a rejected one', () => {
    const ok = photo();
    const res = validateMedia([ok, photo({ mimeType: 'image/gif' })], []);
    expect(res.items).toEqual([ok]);
    expect(res.error).not.toBeNull();
  });
});
