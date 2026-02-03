import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export enum ProposalType {
  ARBAN_BUDGET = 0,
  ARBAN_LEADER = 1,
  ARBAN_PROJECT = 2,
  ZUN_POLICY = 3,
  ZUN_ELDER = 4,
  ZUN_BUDGET = 5,
  MYANGAN_LAW = 6,
  MYANGAN_LEADER = 7,
  TUMEN_NATIONAL = 8,
  TUMEN_CHAIRMAN = 9,
  CONSTITUTIONAL = 10,
}

export enum ProposalStatus {
  ACTIVE = 0,
  PASSED = 1,
  REJECTED = 2,
  EXECUTED = 3,
  CANCELLED = 4,
}

export enum KhuralLevel {
  ARBAN = 1,
  ZUN = 2,
  MYANGAN = 3,
  TUMEN = 4,
}

export interface Proposal {
  proposalId: number;
  proposalType: ProposalType;
  khuralLevel: KhuralLevel;
  khuralId: number;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  startTime: Date;
  endTime: Date;
  finalized: boolean;
  executed: boolean;
  results: {
    votesFor: number;
    votesAgainst: number;
    quorumRequired: number;
    totalEligible: number;
  };
}

export interface CreateProposalParams {
  proposalType: ProposalType;
  khuralLevel: KhuralLevel;
  khuralId: number;
  title: string;
  description: string;
  votingPeriod: number;
  privateKey: string;
}

export interface VoteParams {
  proposalId: number;
  support: boolean;
  reason?: string;
  privateKey: string;
}

/**
 * @hook useVotingCenter
 * @description React hook for Legislative Branch voting
 */
export const useVotingCenter = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch proposals by level
   */
  const fetchProposals = useCallback(async (level: KhuralLevel) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_BASE}/legislative/voting/proposals`,
        { params: { level } }
      );
      
      if (response.data.success) {
        setProposals(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get single proposal
   */
  const getProposal = useCallback(async (proposalId: number): Promise<Proposal | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_BASE}/legislative/voting/proposals/${proposalId}`
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch proposal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new proposal
   */
  const createProposal = useCallback(async (params: CreateProposalParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_BASE}/legislative/voting/proposals`,
        params
      );
      
      if (response.data.success) {
        // Refresh proposals list
        await fetchProposals(params.khuralLevel);
        return response.data.data;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProposals]);

  /**
   * Cast vote on proposal
   */
  const vote = useCallback(async (params: VoteParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_BASE}/legislative/voting/proposals/${params.proposalId}/vote`,
        {
          support: params.support,
          reason: params.reason,
          privateKey: params.privateKey,
        }
      );
      
      if (response.data.success) {
        // Refresh proposal
        const updated = await getProposal(params.proposalId);
        if (updated) {
          setProposals(prev => 
            prev.map(p => p.proposalId === params.proposalId ? updated : p)
          );
        }
        return response.data.data;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cast vote');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getProposal]);

  /**
   * Finalize proposal
   */
  const finalizeProposal = useCallback(async (proposalId: number, privateKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_BASE}/legislative/voting/proposals/${proposalId}/finalize`,
        { privateKey }
      );
      
      if (response.data.success) {
        // Refresh proposal
        const updated = await getProposal(proposalId);
        if (updated) {
          setProposals(prev => 
            prev.map(p => p.proposalId === proposalId ? updated : p)
          );
        }
        return response.data.data;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getProposal]);

  /**
   * Check if address has voted
   */
  const hasVoted = useCallback(async (proposalId: number, address: string): Promise<boolean> => {
    try {
      const response = await axios.get(
        `${API_BASE}/legislative/voting/proposals/${proposalId}/has-voted/${address}`
      );
      
      return response.data.data.hasVoted;
    } catch (err) {
      return false;
    }
  }, []);

  /**
   * Get proposal results
   */
  const getResults = useCallback(async (proposalId: number) => {
    try {
      const response = await axios.get(
        `${API_BASE}/legislative/voting/proposals/${proposalId}/results`
      );
      
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get results');
      return null;
    }
  }, []);

  return {
    proposals,
    loading,
    error,
    fetchProposals,
    getProposal,
    createProposal,
    vote,
    finalizeProposal,
    hasVoted,
    getResults,
  };
};

/**
 * Helper: Get proposal type label
 */
export const getProposalTypeLabel = (type: ProposalType): string => {
  const labels = {
    [ProposalType.ARBAN_BUDGET]: 'Arban Budget',
    [ProposalType.ARBAN_LEADER]: 'Arban Leader Election',
    [ProposalType.ARBAN_PROJECT]: 'Arban Project',
    [ProposalType.ZUN_POLICY]: 'Zun Policy',
    [ProposalType.ZUN_ELDER]: 'Zun Elder Election',
    [ProposalType.ZUN_BUDGET]: 'Zun Budget',
    [ProposalType.MYANGAN_LAW]: 'Myangan Law',
    [ProposalType.MYANGAN_LEADER]: 'Myangan Leader Election',
    [ProposalType.TUMEN_NATIONAL]: 'National Legislation',
    [ProposalType.TUMEN_CHAIRMAN]: 'National Chairman Election',
    [ProposalType.CONSTITUTIONAL]: 'Constitutional Amendment',
  };
  return labels[type] || 'Unknown';
};

/**
 * Helper: Get status label
 */
export const getStatusLabel = (status: ProposalStatus): string => {
  const labels = {
    [ProposalStatus.ACTIVE]: 'Active',
    [ProposalStatus.PASSED]: 'Passed',
    [ProposalStatus.REJECTED]: 'Rejected',
    [ProposalStatus.EXECUTED]: 'Executed',
    [ProposalStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] || 'Unknown';
};

/**
 * Helper: Get level label
 */
export const getLevelLabel = (level: KhuralLevel): string => {
  const labels = {
    [KhuralLevel.ARBAN]: 'Arban',
    [KhuralLevel.ZUN]: 'Zun',
    [KhuralLevel.MYANGAN]: 'Myangan',
    [KhuralLevel.TUMEN]: 'Tumen (National)',
  };
  return labels[level] || 'Unknown';
};

/**
 * Helper: Calculate participation rate
 */
export const getParticipationRate = (proposal: Proposal): number => {
  const totalVotes = proposal.results.votesFor + proposal.results.votesAgainst;
  if (proposal.results.totalEligible === 0) return 0;
  return (totalVotes / proposal.results.totalEligible) * 100;
};

/**
 * Helper: Check if proposal is active
 */
export const isProposalActive = (proposal: Proposal): boolean => {
  return (
    proposal.status === ProposalStatus.ACTIVE &&
    new Date(proposal.endTime) > new Date()
  );
};

/**
 * Helper: Check if quorum met
 */
export const isQuorumMet = (proposal: Proposal): boolean => {
  const totalVotes = proposal.results.votesFor + proposal.results.votesAgainst;
  return totalVotes >= proposal.results.quorumRequired;
};
