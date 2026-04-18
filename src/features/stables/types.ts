export type HorseStatus
  = | 'PRE_TRAINING'
    | 'IN_TRAINING'
    | 'REHAB'
    | 'RETIRED'
    | 'SOLD';

export type EntryStatus
  = | 'ENTERED'
    | 'DECLARED'
    | 'NON_RUNNER'
    | 'RAN'
    | 'DISQUALIFIED'
    | 'VOID';

export type HorsePhoto = {
  url: string;
  caption?: string;
};

export type HorsePedigree = {
  sire?: string;
  dam?: string;
  damsire?: string;
};

export type Trainer = {
  id: string;
  name: string;
};

export type Jockey = {
  id: string;
  name: string;
};

export type Course = {
  id: string;
  name: string;
  country: string | null;
};

export type Meeting = {
  id: string;
  date: string;
  course: Course;
};

export type Race = {
  id: string;
  name: string | null;
  postTime: string;
  raceType: string | null;
  distanceFurlongs: number | null;
  className: string | null;
  goingDescription: string | null;
  meeting: Meeting;
};

export type Entry = {
  id: string;
  status: EntryStatus;
  draw: number | null;
  weightLbs: number | null;
  finishingPosition: number | null;
  beatenLengths: string | null;
  ratingAchieved: number | null;
  timeformComment: string | null;
  performanceRating: number | null;
  starRating: number | null;
  createdAt: string;
  updatedAt: string;
  jockey: Jockey | null;
  race: Race;
};

export type Horse = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  status: HorseStatus;
  bio: string | null;
  trainerNotes: string | null;
  photos: HorsePhoto[];
  pedigree: HorsePedigree | null;
  ownershipBlurb: string | null;
  circleSpaceId: string | null;
  trainerId: string | null;
  trainer: Trainer | null;
  sortOrder: number;
  publishedAt: string;
  latestEntryId: string | null;
  nextEntryId: string | null;
  providerEntityId: string | null;
  providerLastSync: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HorseDetail = {
  entries: Entry[];
} & Horse;
