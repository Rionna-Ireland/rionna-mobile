export const PADDOCK_QUERY_ROOT = 'paddock';

export type OfferCategory = 'restaurant' | 'hotel' | 'lifestyle' | 'racing' | 'other';

export type Offer = {
  id: string;
  title: string;
  partnerName: string;
  category: OfferCategory;
  description: string;
  imageUrl: string | null;
  discountCode: string | null;
  redeemUrl: string | null;
  howToRedeem: string | null;
  validUntil: string | null;
};

export type OffersResult = { ok: boolean; offers: Offer[] };

export type CharityStoryTeaser = {
  id: string;
  /** S13-18: absent on older backends (treated as news). */
  source?: 'news' | 'circle';
  /** News stories: opens /news/{slug}. Null for circle stories. */
  slug: string | null;
  /** Circle stories: opens the post thread. */
  spaceId?: string | null;
  postId?: string | null;
  title: string;
  subtitle: string | null;
  featuredImageUrl: string | null;
  publishedAt: string;
  /** Optional: lets the client compute read time (not served yet). */
  wordCount?: number | null;
  body?: string | null;
};

export type CurrentCharity = { name: string; url: string | null; logoUrl?: string | null };

export type Charity = {
  charityName: string;
  description: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  percentage: number;
  totalCents: number;
  goalCents: number | null;
  goalProgress: number | null;
  currency: string;
  stories: CharityStoryTeaser[];
  pollId: string | null;
  /** S13-15: several current charities. Absent on older backends. */
  charities?: CurrentCharity[];
};

export type CharityResult = { ok: boolean; charity: Charity | null };
