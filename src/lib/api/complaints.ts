import { api } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Complaint,
  FileComplaintDto,
  ComplaintStats,
  ComplaintStatus,
  ComplaintCategory,
} from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const listComplaints = (params?: {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  level?: number;
  page?: number;
  limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  if (params?.level) qs.set('level', String(params.level));
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return api.get<Complaint[]>(`/complaints${q ? `?${q}` : ''}`);
};

export const myComplaints = (page?: number) =>
  api.get<Complaint[]>(`/complaints/my${page ? `?page=${page}` : ''}`);

export const getComplaintStats = () =>
  api.get<ComplaintStats>('/complaints/stats');

export const getComplaintBook = (level: number, entityId?: string, page?: number, limit?: number) => {
  const qs = new URLSearchParams({ level: String(level) });
  if (entityId) qs.set('entityId', entityId);
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  return api.get<Complaint[]>(`/complaints/book?${qs}`);
};

export const getComplaint = (id: string) =>
  api.get<Complaint>(`/complaints/${id}`);

export const fileComplaint = (data: FileComplaintDto) =>
  api.post<Complaint>('/complaints', data);

export const respondToComplaint = (
  id: string,
  body: { body: string; isOfficial?: boolean; attachments?: string[] },
) => api.post(`/complaints/${id}/respond`, body);

export const assignComplaintReviewer = (id: string, assigneeId: string) =>
  api.patch(`/complaints/${id}/assign`, { assigneeId });

export const escalateComplaint = (id: string, reason: string) =>
  api.post(`/complaints/${id}/escalate`, { reason });

export const escalateComplaintToCourt = (id: string) =>
  api.post(`/complaints/${id}/escalate-court`, {});

export const resolveComplaint = (id: string, resolution: string) =>
  api.patch(`/complaints/${id}/resolve`, { resolution });

export const dismissComplaint = (id: string, reason: string) =>
  api.patch(`/complaints/${id}/dismiss`, { reason });

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useComplaints = (params?: Parameters<typeof listComplaints>[0]) =>
  useQuery({
    queryKey: ['complaints', params],
    queryFn: () => listComplaints(params),
  });

export const useMyComplaints = (page?: number) =>
  useQuery({
    queryKey: ['myComplaints', page],
    queryFn: () => myComplaints(page),
  });

export const useComplaintStats = () =>
  useQuery({
    queryKey: ['complaintStats'],
    queryFn: getComplaintStats,
  });

export const useComplaintBook = (level: number) =>
  useQuery({
    queryKey: ['complaintBook', level],
    queryFn: () => getComplaintBook(level),
  });

export const useFileComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FileComplaintDto) => fileComplaint(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['complaintStats'] });
    },
  });
};

export const useEscalateComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      escalateComplaint(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['complaintStats'] });
    },
  });
};
