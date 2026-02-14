import { api } from './client';
import { useQuery } from '@tanstack/react-query';
import type { CourtCase, CourtCaseStats, CourtCaseStatus } from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const listCases = (params?: {
  status?: CourtCaseStatus;
  page?: number;
  limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return api.get<CourtCase[]>(`/justice/cases${q ? `?${q}` : ''}`);
};

export const getCase = (id: string) =>
  api.get<CourtCase>(`/justice/cases/${id}`);

export const getCaseStats = () =>
  api.get<CourtCaseStats>('/justice/stats');

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useCases = (params?: Parameters<typeof listCases>[0]) =>
  useQuery({
    queryKey: ['courtCases', params],
    queryFn: () => listCases(params),
  });

export const useCase = (id: string) =>
  useQuery({
    queryKey: ['courtCase', id],
    queryFn: () => getCase(id),
    enabled: !!id,
  });

export const useCaseStats = () =>
  useQuery({
    queryKey: ['courtCaseStats'],
    queryFn: getCaseStats,
  });
