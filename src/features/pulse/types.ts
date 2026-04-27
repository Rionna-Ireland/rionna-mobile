export type NextRunEntry = {
  id: string;
  status: string;
  draw: number | null;
  weightLbs: number | null;
  horse: {
    id: string;
    name: string;
    photos: Array<{ url: string; caption?: string }>;
  };
  race: {
    id: string;
    name: string | null;
    postTime: string;
    meeting: {
      id: string;
      date: string;
      course: {
        id: string;
        name: string;
      };
    };
  };
  jockey: { id: string; name: string } | null;
};

export type LatestResult = {
  id: string;
  finishingPosition: number | null;
  horse: {
    id: string;
    name: string;
  };
  race: {
    id: string;
    postTime: string;
    meeting: {
      course: {
        name: string;
      };
    };
  };
};

export type TrainerPost = {
  id: number;
  name: string;
  body: { plain_text_body?: string } | null;
  created_at: string;
  url: string;
};

export type CircleFeedItem = {
  id: string;
  kind: 'news' | 'post';
  title: string;
  excerpt: string | null;
  createdAt: string | null;
  spaceName: string | null;
  authorName: string | null;
  commentCount: number;
  likeCount: number;
  imageUrl: string | null;
  url: string | null;
};
