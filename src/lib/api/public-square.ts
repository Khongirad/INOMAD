import { api } from './client';

export type SquarePostType = 'DEBATE' | 'PETITION' | 'PROPOSAL' | 'ANNOUNCEMENT';
export type SquareStatus = 'OPEN' | 'VOTING' | 'ESCALATED' | 'LEGISLATIVE' | 'CLOSED';
export type HierarchyLevel =
  | 'LEVEL_1'
  | 'LEVEL_10'
  | 'LEVEL_100'
  | 'LEVEL_1000'
  | 'LEVEL_10000'
  | 'REPUBLIC'
  | 'CONFEDERATION';

export const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  LEVEL_1: 'Семья',
  LEVEL_10: 'Арбан',
  LEVEL_100: 'Зун',
  LEVEL_1000: 'Мьянган',
  LEVEL_10000: 'Тумэн',
  REPUBLIC: 'Республика',
  CONFEDERATION: 'Конфедерация',
};

export interface SquarePost {
  id: string;
  createdAt: string;
  authorId: string;
  author: { seatId: string; username?: string };
  level: HierarchyLevel;
  scopeId: string;
  scopeName: string;
  title: string;
  content: string;
  postType: SquarePostType;
  status: SquareStatus;
  supportCount: number;
  requiredSupport: number;
  escalatedTo?: string;
  escalatedAt?: string;
  khuralProposalId?: string;
  _count?: { votes: number };
}

/**
 * List posts — public
 */
export const getSquarePosts = (params?: {
  level?: HierarchyLevel;
  scopeId?: string;
  postType?: SquarePostType;
  status?: SquareStatus;
  page?: number;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.level) q.set('level', params.level);
  if (params?.scopeId) q.set('scopeId', params.scopeId);
  if (params?.postType) q.set('postType', params.postType);
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return api.get<{ data: SquarePost[]; total: number }>(`/public-square?${q.toString()}`);
};

export const getTrendingPetitions = (limit = 10) =>
  api.get<SquarePost[]>(`/public-square/trending?limit=${limit}`);

export const getSquarePost = (id: string) =>
  api.get<SquarePost & { votes: { voterId: string; support: boolean }[] }>(`/public-square/${id}`);

export const createSquarePost = (body: {
  level: HierarchyLevel;
  scopeId: string;
  scopeName: string;
  postType: SquarePostType;
  title: string;
  content: string;
  requiredSupport?: number;
}) => api.post<SquarePost>('/public-square', body);

export const voteSquarePost = (postId: string, support: boolean) =>
  api.post<{ supportCount: number }>('/public-square/vote', { postId, support });

export const escalateSquarePost = (id: string) =>
  api.post<{ escalated: boolean; reachedKhural: boolean }>(`/public-square/${id}/escalate`, {});
