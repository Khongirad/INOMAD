/**
 * API Client for Distribution endpoints
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface DistributionStatus {
  perCitizenAmount: string | null;
  totalDistributed: string | null;
  distributionPool: string | null;
  sovereignFund: string | null;
}

export interface DistributionEligibility {
  eligible: boolean;
  reason?: string;
  seatId?: string;
}

/**
 * Get distribution status
 */
export async function getDistributionStatus(): Promise<DistributionStatus> {
  try {
    const response = await fetch(`${API_BASE}/distribution/status`);
    if (!response.ok) throw new Error('Failed to fetch distribution status');
    return await response.json();
  } catch (error) {
    console.error('Error fetching distribution status:', error);
    return {
      perCitizenAmount: null,
      totalDistributed: null,
      distributionPool: null,
      sovereignFund: null,
    };
  }
}

/**
 * Check if citizen has received distribution
 */
export async function hasReceivedDistribution(seatId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/distribution/received/${seatId}`);
    if (!response.ok) throw new Error('Failed to check distribution');
    const data = await response.json();
    return data.hasReceived || false;
  } catch (error) {
    console.error('Error checking distribution:', error);
    return false;
  }
}

/**
 * Check distribution eligibility for user
 */
export async function checkEligibility(userId: string): Promise<DistributionEligibility> {
  try {
    const response = await fetch(`${API_BASE}/distribution/eligibility/${userId}`);
    if (!response.ok) throw new Error('Failed to check eligibility');
    return await response.json();
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return {
      eligible: false,
      reason: 'Failed to fetch eligibility',
    };
  }
}
