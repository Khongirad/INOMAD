import { api } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { KhuralGroup, KhuralLevel } from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const listKhuralGroups = (level?: KhuralLevel) =>
  api.get<KhuralGroup[]>(`/khural${level ? `?level=${level}` : ''}`);

export const getKhuralGroup = (id: string) =>
  api.get<KhuralGroup>(`/khural/${id}`);

export const createKhuralGroup = (data: { name: string; level: KhuralLevel; parentId?: string }) =>
  api.post<KhuralGroup>('/khural', data);

export const applySeat = (groupId: string, seatIndex: number) =>
  api.post(`/khural/${groupId}/apply-seat`, { seatIndex });

export const assignSeat = (groupId: string, seatIndex: number, userId: string) =>
  api.post(`/khural/${groupId}/assign-seat`, { seatIndex, userId });

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useKhuralGroups = (level?: KhuralLevel) =>
  useQuery({
    queryKey: ['khuralGroups', level],
    queryFn: () => listKhuralGroups(level),
  });

export const useKhuralGroup = (id: string) =>
  useQuery({
    queryKey: ['khuralGroup', id],
    queryFn: () => getKhuralGroup(id),
    enabled: !!id,
  });

export const useApplySeat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, seatIndex }: { groupId: string; seatIndex: number }) =>
      applySeat(groupId, seatIndex),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['khuralGroups'] }),
  });
};
