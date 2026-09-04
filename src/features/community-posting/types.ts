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

export type PostImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type CreatePostInput = {
  spaceId: string;
  title?: string;
  body: string;
  image?: PostImage;
};

export type CreatePostFailure = 'blocked' | 'not_allowed' | 'rate_limited' | 'circle_failed' | 'image_failed';

export type CreatePostResult
  = | { ok: true; post: { circlePostId: string; spaceId: string } }
    | { ok: false; reason: CreatePostFailure };

export type ImageUploadUrlResult = {
  signedUploadUrl: string;
  path: string;
};

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
