/**
 * Custom hook for Sovereign Fund data with auto-refresh
 */

'use client';

import { useState, useEffect } from 'react';
import type { FundOverview } from '../api/sovereign-fund';
import { getFundOverview } from '../api/sovereign-fund';

export function useSovereignFund(refreshInterval = 30000) {
  const [data, setData] = useState<FundOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const overview = await getFundOverview();
        if (mounted) {
          setData(overview);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch fund data'));
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    if (refreshInterval > 0) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  return {
    data,
    isLoading,
    error,
    balance: data?.stats?.balance,
    incomeBreakdown: data?.incomeBreakdown || [],
    investments: data?.activeInvestments || [],
    reports: data?.annualReports || [],
  };
}
