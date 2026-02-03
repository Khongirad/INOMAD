/**
 * API Client for Sovereign Fund endpoints
 * Provides type-safe access to fund transparency data
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface FundStats {
  balance: string;
  totalReceived: string;
  totalInvested: string;
  totalWithdrawn: string;
  activeInvestments: number;
}

export interface IncomeBreakdown {
  source: string;
  sourceId: number;
  amount: string;
}

export interface Investment {
  id: number;
  name: string;
  description: string;
  amount: string;
  beneficiary: string;
  timestamp: number;
  active: boolean;
  approvalHash: string;
}

export interface AnnualReport {
  year: number;
  totalBalance: string;
  received: string;
  invested: string;
  investmentReturns: string;
  reportHash: string;
  publishedAt: number;
}

export interface FundOverview {
  stats: FundStats | null;
  incomeBreakdown: IncomeBreakdown[];
  activeInvestments: Investment[];
  annualReports: AnnualReport[];
}

/**
 * Get current fund balance
 */
export async function getFundBalance(): Promise<{ balance: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/sovereign-fund/balance`);
    if (!response.ok) throw new Error('Failed to fetch fund balance');
    return await response.json();
  } catch (error) {
    console.error('Error fetching fund balance:', error);
    return { balance: null };
  }
}

/**
 * Get fund statistics
 */
export async function getFundStats(): Promise<FundStats | null> {
  try {
    const response = await fetch(`${API_BASE}/sovereign-fund/stats`);
    if (!response.ok) throw new Error('Failed to fetch fund stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching fund stats:', error);
    return null;
  }
}

/**
 * Get income breakdown by source
 */
export async function getIncomeBreakdown(): Promise<IncomeBreakdown[]> {
  try {
    const response = await fetch(`${API_BASE}/sovereign-fund/income`);
    if (!response.ok) throw new Error('Failed to fetch income breakdown');
    return await response.json();
  } catch (error) {
    console.error('Error fetching income breakdown:', error);
    return [];
  }
}

/**
 * Get active investments
 */
export async function getActiveInvestments(): Promise<Investment[]> {
  try {
    const response = await fetch(`${API_BASE}/sovereign-fund/investments`);
    if (!response.ok) throw new Error('Failed to fetch investments');
    return await response.json();
  } catch (error) {
    console.error('Error fetching investments:', error);
    return [];
  }
}

/**
 * Get annual reports
 */
export async function getAnnualReports(): Promise<AnnualReport[]> {
  try {
    const response = await fetch(`${API_BASE}/sovereign-fund/reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return await response.json();
  } catch (error) {
    console.error('Error fetching annual reports:', error);
    return [];
  }
}

/**
 * Get complete fund overview
 */
export async function getFundOverview(): Promise<FundOverview> {
  try {
    const response = await fetch(`${API_BASE}/sovereign-fund/overview`);
    if (!response.ok) throw new Error('Failed to fetch fund overview');
    return await response.json();
  } catch (error) {
    console.error('Error fetching fund overview:', error);
    return {
      stats: null,
      incomeBreakdown: [],
      activeInvestments: [],
      annualReports: [],
    };
  }
}

/**
 * Format large numbers for display
 */
export function formatLargeNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2)}T`;
  } else if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  
  return num.toFixed(2);
}

/**
 * Format currency with Altan symbol
 */
export function formatAltan(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₳`;
}
