export const POLLS_QUERY_ROOT = 'polls';

export type PollScope = 'club' | 'space';
export type PollOption = { id: string; label: string; sortOrder: number };
export type PollResults = { total: number; byOption: Record<string, number> };

export type Poll = {
  id: string;
  question: string;
  scope: PollScope;
  circleSpaceId: string | null;
  status: 'open' | 'closed';
  publishedAt: string;
  closesAt: string | null;
  options: PollOption[];
  myVoteOptionId: string | null;
  results: PollResults | null;
};

export type ActivePollsResult = { ok: boolean; polls: Poll[] };

export type PollVoteVariables = { pollId: string; optionId: string };
export type PollVoteResult
  = | { ok: true; poll: Poll }
    | { ok: false; reason: 'not_found' | 'closed' | 'invalid_option' | 'not_member' };
