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
  slug: string;
  title: string;
  subtitle: string | null;
  featuredImageUrl: string | null;
  publishedAt: string;
};

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
};

export type CharityResult = { ok: boolean; charity: Charity | null };
