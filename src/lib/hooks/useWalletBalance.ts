/**
 * Custom hook for wallet balance with distribution status
 */

'use client';

import { useState, useEffect } from 'react';
import { checkEligibility, hasReceivedDistribution } from '../api/distribution';
import type { DistributionEligibility } from '../api/distribution';

export function useWalletBalance(userId: string | null, refreshInterval = 10000) {
  const [eligibility, setEligibility] = useState<DistributionEligibility | null>(null);
  const [hasReceived, setHasReceived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        // Check eligibility
        const elig = await checkEligibility(userId);
        
        if (mounted) {
          setEligibility(elig);
          
          // If has seatId, check if received distribution
          if (elig.seatId) {
            const received = await hasReceivedDistribution(elig.seatId);
            setHasReceived(received);
          }
          
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch wallet data'));
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
  }, [userId, refreshInterval]);

  return {
    eligibility,
    hasReceived,
    seatId: eligibility?.seatId,
    isEligible: eligibility?.eligible || false,
    reason: eligibility?.reason,
    isLoading,
    error,
  };
}
