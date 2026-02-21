import { api } from './client';

export interface BranchStatus {
  branch: 'LEGISLATIVE' | 'EXECUTIVE' | 'JUDICIAL' | 'BANKING';
  status: 'PROVISIONAL' | 'FORMED';
  provisionalRoles: { roleName: string; roleDisplayName?: string; startedAt: string }[];
  transferredRoles: number;
  formedLeaders: number;
}

export interface GovernanceSummary {
  timestamp: string;
  isFormationPeriod: boolean;
  banner: string | null;
  branches: BranchStatus[];
  cik: { id: string; type: string; status: string; mandate?: string; members: any[] } | null;
  activeElections: number;
  electionsByRung: Record<string, number>;
  featuredElections: {
    id: string;
    fromLevel: string;
    toLevel: string;
    branch: string;
    scopeName: string;
    status: string;
    votingEnd: string;
    ballotCount: number;
    leadingCandidate: any;
  }[];
  hotPetitions: {
    id: string;
    title: string;
    level: string;
    scopeName: string;
    supportCount: number;
    requiredSupport: number;
    status: string;
    postType: string;
  }[];
  escalatedPosts: number;
  legislativePosts: number;
  stats: {
    totalCitizens: number;
    verifiedCitizens: number;
    activeOrganizations: number;
    verificationRate: number;
  };
  recentActions: any[];
}

export const getGovernanceSummary = () =>
  api.get<GovernanceSummary>('/governance/summary');
