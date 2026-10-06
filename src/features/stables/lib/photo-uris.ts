/**
 * Sized photo URLs, one builder per surface. The hero transition (S14-05)
 * re-draws a source's photo in its overlay from the image cache, so every
 * surface must ask for exactly the same URL string it was drawn with.
 */

/** Stables card photo (86×146). */
export function cardPhotoUri(url: string): string {
  return `${url}?width=400&quality=80`;
}

/** Home "My horses" avatar (41pt circle). */
export function avatarPhotoUri(url: string): string {
  return `${url}?width=120&quality=80`;
}

/** Horse detail hero (full width). */
export function heroPhotoUri(url: string): string {
  return `${url}?width=1000&quality=80`;
}
