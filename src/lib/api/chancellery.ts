import { api } from './client';
import { useQuery } from '@tanstack/react-query';
import type { ChancelleryContract, ChancelleryStats } from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const getChancelleryRegistry = (params?: {
  status?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.stage) qs.set('stage', params.stage);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return api.get<ChancelleryContract[]>(`/chancellery/registry${q ? `?${q}` : ''}`);
};

export const getChancelleryContractDetails = (id: string) =>
  api.get<ChancelleryContract>(`/chancellery/registry/${id}`);

export const getChancelleryDisputes = (page?: number, limit?: number) => {
  const qs = new URLSearchParams();
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  const q = qs.toString();
  return api.get(`/chancellery/disputes${q ? `?${q}` : ''}`);
};

export const getChancelleryComplaints = (page?: number, limit?: number) => {
  const qs = new URLSearchParams();
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  const q = qs.toString();
  return api.get(`/chancellery/complaints${q ? `?${q}` : ''}`);
};

export const getChancelleryStats = () =>
  api.get<ChancelleryStats>('/chancellery/stats');

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useChancelleryRegistry = (params?: Parameters<typeof getChancelleryRegistry>[0]) =>
  useQuery({
    queryKey: ['chancelleryRegistry', params],
    queryFn: () => getChancelleryRegistry(params),
  });

export const useChancelleryContract = (id: string) =>
  useQuery({
    queryKey: ['chancelleryContract', id],
    queryFn: () => getChancelleryContractDetails(id),
    enabled: !!id,
  });

export const useChancelleryStats = () =>
  useQuery({
    queryKey: ['chancelleryStats'],
    queryFn: getChancelleryStats,
  });
