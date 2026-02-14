import { api } from './client';
import { useQuery } from '@tanstack/react-query';
import type { HierarchyNode, OrganizationType, BranchType } from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const getHierarchyTree = () =>
  api.get<HierarchyNode>('/organizations/hierarchy');

export const listOrganizations = (params?: {
  type?: OrganizationType;
  branch?: BranchType;
  republic?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.branch) qs.set('branch', params.branch);
  if (params?.republic) qs.set('republic', params.republic);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return api.get<HierarchyNode[]>(`/organizations${q ? `?${q}` : ''}`);
};

export const getOrgLeaderboard = (type?: OrganizationType, limit = 50) => {
  const qs = new URLSearchParams();
  if (type) qs.set('type', type);
  qs.set('limit', String(limit));
  return api.get<HierarchyNode[]>(`/organizations/leaderboard?${qs}`);
};

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useHierarchyTree = () =>
  useQuery({
    queryKey: ['hierarchyTree'],
    queryFn: getHierarchyTree,
    staleTime: 60 * 1000, // hierarchy changes rarely
  });

export const useOrganizations = (params?: Parameters<typeof listOrganizations>[0]) =>
  useQuery({
    queryKey: ['organizations', params],
    queryFn: () => listOrganizations(params),
  });

export const useOrgLeaderboard = (type?: OrganizationType, limit?: number) =>
  useQuery({
    queryKey: ['leaderboard', type, limit],
    queryFn: () => getOrgLeaderboard(type, limit),
  });
