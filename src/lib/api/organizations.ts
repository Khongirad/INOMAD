import { api } from './client';

// ==========================================
// TYPES
// ==========================================

export interface Organization {
  id: string;
  name: string;
  type: string;
  branch?: string;
  republicId?: string;
  description?: string;
  foundedAt: Date;
  leader?: {
    id: string;
    username: string;
  };
  trustScore: number;
  qualityScore: number;
  financialScore: number;
  overallRating: number;
  currentRank?: number;
  previousRank?: number;
  memberCount?: number;
  contractsCompleted?: number;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user?: {
    username: string;
    seatId?: string;
  };
}

export interface CreateOrganizationDto {
  name: string;
  type: string;
  branch?: string;
  republicId?: string;
  description?: string;
}

export interface RatingData {
  financialScore: number;
  trustScore: number;
  qualityScore: number;
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Get all organizations (with optional filters)
 */
export const getOrganizations = async (params?: {
  type?: string;
  branch?: string;
  republicId?: string;
}): Promise<Organization[]> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.branch) queryParams.append('branch', params.branch);
  if (params?.republicId) queryParams.append('republicId', params.republicId);

  const query = queryParams.toString();
  return api.get<Organization[]>(`/organizations${query ? `?${query}` : ''}`);
};

/**
 * Get organization by ID
 */
export const getOrganization = async (id: string): Promise<Organization> => {
  return api.get<Organization>(`/organizations/${id}`);
};

/**
 * Create a new organization
 */
export const createOrganization = async (data: CreateOrganizationDto): Promise<Organization> => {
  return api.post<Organization>('/organizations', data);
};

/**
 * Update organization
 */
export const updateOrganization = async (
  id: string,
  data: Partial<CreateOrganizationDto>
): Promise<Organization> => {
  return api.post<Organization>(`/organizations/${id}`, data);
};

/**
 * Delete organization
 */
export const deleteOrganization = async (id: string): Promise<void> => {
  return api.post<void>(`/organizations/${id}`, { _method: 'DELETE' });
};

/**
 * Get Top 100 leaderboard
 */
export const getLeaderboard = async (): Promise<Organization[]> => {
  return api.get<Organization[]>('/organizations/leaderboard');
};

/**
 * Rate an organization
 */
export const rateOrganization = async (
  id: string,
  ratings: RatingData
): Promise<{ message: string }> => {
  return api.post<{ message: string }>(`/organizations/${id}/rate`, ratings);
};

/**
 * Get organization ratings
 */
export const getOrganizationRatings = async (id: string): Promise<any[]> => {
  return api.get<any[]>(`/organizations/${id}/ratings`);
};

/**
 * Add member to organization
 */
export const addOrganizationMember = async (
  id: string,
  data: { userId: string; role: string }
): Promise<OrganizationMember> => {
  return api.post<OrganizationMember>(`/organizations/${id}/members`, data);
};

/**
 * Remove member from organization
 */
export const removeOrganizationMember = async (
  id: string,
  userId: string
): Promise<void> => {
  return api.post<void>(`/organizations/${id}/members/${userId}`, { _method: 'DELETE' });
};

/**
 * Transfer leadership
 */
export const transferLeadership = async (
  id: string,
  newLeaderId: string
): Promise<Organization> => {
  return api.post<Organization>(`/organizations/${id}/transfer-leadership`, {
    newLeaderId,
  });
};

/**
 * Get Arbad network map
 */
export const getNetworkMap = async (): Promise<any> => {
  return api.get<any>('/organizations/network/map');
};

/**
 * Get network connections for specific arbad
 */
export const getNetworkConnections = async (arbadId: string): Promise<any> => {
  return api.get<any>(`/organizations/network/${arbadId}`);
};
