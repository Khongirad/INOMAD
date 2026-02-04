import { api } from '../api';

// ==========================================
// TYPES
// ==========================================

export type ElectionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Election {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: ElectionStatus;
  startDate: Date;
  endDate: Date;
  winnerId?: string;
  createdBy: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  };
  candidates?: ElectionCandidate[];
  totalVotes?: number;
  createdAt: Date;
}

export interface ElectionCandidate {
  id: string;
  electionId: string;
  userId: string;
  statement?: string;
  voteCount: number;
  createdAt: Date;
  user?: {
    username: string;
    seatId?: string;
  };
}

export interface CreateElectionDto {
  organizationId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface CandidateDto {
  statement?: string;
}

export interface VoteDto {
  candidateId: string;
}

export interface ElectionResults {
  election: Election;
  candidates: Array<ElectionCandidate & { percentage: number }>;
  winner?: ElectionCandidate;
  totalVotes: number;
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Create a new election
 */
export const createElection = async (data: CreateElectionDto): Promise<Election> => {
  return api.post<Election>('/elections/create', data);
};

/**
 * Get election by ID
 */
export const getElection = async (id: string): Promise<Election> => {
  return api.get<Election>(`/elections/${id}`);
};

/**
 * Get elections for organization
 */
export const getOrganizationElections = async (organizationId: string): Promise<Election[]> => {
  return api.get<Election[]>(`/elections/organization/${organizationId}`);
};

/**
 * Get active elections
 */
export const getActiveElections = async (): Promise<Election[]> => {
  return api.get<Election[]>('/elections/status/active');
};

/**
 * Get upcoming elections
 */
export const getUpcomingElections = async (): Promise<Election[]> => {
  return api.get<Election[]>('/elections/status/upcoming');
};

/**
 * Register as candidate
 */
export const registerCandidate = async (
  electionId: string,
  data: CandidateDto
): Promise<ElectionCandidate> => {
  return api.post<ElectionCandidate>(`/elections/${electionId}/candidate`, data);
};

/**
 * Cast vote
 */
export const castVote = async (
  electionId: string,
  data: VoteDto
): Promise<{ message: string; voteCount: number }> => {
  return api.post<{ message: string; voteCount: number }>(
    `/elections/${electionId}/vote`,
    data
  );
};

/**
 * Complete election (admin/creator only)
 */
export const completeElection = async (electionId: string): Promise<ElectionResults> => {
  return api.post<ElectionResults>(`/elections/${electionId}/complete`, {});
};

/**
 * Cancel election (admin/creator only)
 */
export const cancelElection = async (electionId: string): Promise<Election> => {
  return api.post<Election>(`/elections/${electionId}/cancel`, {});
};

/**
 * Activate scheduled elections (cron job)
 */
export const activateScheduledElections = async (): Promise<{ activated: number }> => {
  return api.post<{ activated: number }>('/elections/cron/activate', {});
};

/**
 * Auto-complete expired elections (cron job)
 */
export const autoCompleteElections = async (): Promise<{ completed: number }> => {
  return api.post<{ completed: number }>('/elections/cron/complete', {});
};
