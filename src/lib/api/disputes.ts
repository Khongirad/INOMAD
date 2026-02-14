import { api } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dispute, OpenDisputeDto, DisputeStatus } from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const listDisputes = (status?: DisputeStatus) =>
  api.get<Dispute[]>(`/disputes${status ? `?status=${status}` : ''}`);

export const getDispute = (id: string) =>
  api.get<Dispute>(`/disputes/${id}`);

export const openDispute = (data: OpenDisputeDto) =>
  api.post<Dispute>('/disputes', data);

export const startNegotiation = (id: string) =>
  api.patch<Dispute>(`/disputes/${id}/negotiate`);

export const settleDispute = (id: string, resolution: string) =>
  api.patch<Dispute>(`/disputes/${id}/settle`, { resolution });

export const escalateDisputeToComplaint = (id: string) =>
  api.post<Dispute>(`/disputes/${id}/escalate-complaint`, {});

export const escalateDisputeToCourt = (id: string) =>
  api.post<Dispute>(`/disputes/${id}/escalate-court`, {});

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useDisputes = (status?: DisputeStatus) =>
  useQuery({
    queryKey: ['disputes', status],
    queryFn: () => listDisputes(status),
  });

export const useDispute = (id: string) =>
  useQuery({
    queryKey: ['dispute', id],
    queryFn: () => getDispute(id),
    enabled: !!id,
  });

export const useOpenDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OpenDisputeDto) => openDispute(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  });
};

export const useSettleDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      settleDispute(id, resolution),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  });
};

export const useEscalateDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, target }: { id: string; target: 'complaint' | 'court' }) =>
      target === 'complaint'
        ? escalateDisputeToComplaint(id)
        : escalateDisputeToCourt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  });
};
