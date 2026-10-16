export type PostableSpace = {
  id: string;
  name: string;
  emoji: string | null;
  isHorse: boolean;
};

export type ListPostableSpacesResult = {
  ok: boolean;
  spaces: PostableSpace[];
};

export type MediaKind = 'image' | 'video';

export type PickedMedia = {
  uri: string;
  kind: MediaKind;
  mimeType: string;
  fileName: string;
  fileSize: number;
  /** Video length in milliseconds. */
  duration?: number;
};

export type MediaUploadUrlResult = {
  kind: MediaKind;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  signedId: string;
  cdnUrl: string;
  mediaToken: string;
};

export type CreatePostInput = {
  spaceId: string;
  title?: string;
  body: string;
  media?: { mediaToken: string }[];
};

export type CreatePostFailure = 'blocked' | 'not_allowed' | 'rate_limited' | 'circle_failed' | 'image_failed';

export type CreatePostResult
  = | { ok: true; post: { circlePostId: string; spaceId: string } }
    | { ok: false; reason: CreatePostFailure };

export type DeletePostInput = {
  spaceId: string;
  postId: string;
};

export type DeletePostResult = {
  ok: boolean;
};

export type ReportReason = 'spam' | 'abusive' | 'off_topic' | 'other';

export type ReportInput = {
  surface: 'post' | 'comment';
  postId: string;
  commentId?: string;
  spaceId?: string;
  excerpt: string;
  authorName?: string;
  reason: ReportReason;
  note?: string;
};

export type ReportContentResult = {
  ok: boolean;
};

/** What's being reported — everything the report sheet needs except the reason/note the member picks. */
export type ReportTarget = {
  surface: 'post' | 'comment';
  postId: string;
  commentId?: string;
  spaceId?: string;
  excerpt: string;
  authorName?: string;
};
