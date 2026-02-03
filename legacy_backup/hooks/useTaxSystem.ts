import { useState, useCallback } from 'react';
import { taxApi, TaxQuote, TaxStats } from '../lib/api/tax.api';

interface UseTaxSystemReturn {
  // State
  quote: TaxQuote | null;
  stats: TaxStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  quoteTax: (amount: string) => Promise<void>;
  collectTax: (data: {
    payerAccountId: string;
    republicKey: string;
    asset: string;
    amount: string;
    privateKey: string;
  }) => Promise<string>;
  fetchStats: () => Promise<void>;
  getConfederationAccount: () => Promise<string>;
  getRepublicAccount: (republicKey: string) => Promise<string>;
  setRepublic: (data: {
    republicKey: string;
    republicAccountId: string;
    privateKey: string;
  }) => Promise<string>;
  setCollector: (data: {
    collectorAddress: string;
    allowed: boolean;
    privateKey: string;
  }) => Promise<string>;
  checkCollector: (address: string) => Promise<boolean>;
}

/**
 * @hook useTaxSystem
 * @description Custom hook for tax system operations
 * 
 * Features:
 * - Quote tax for amounts
 * - Collect tax
 * - Get tax statistics
 * - Admin operations (set republic, set collector)
 */
export const useTaxSystem = (): UseTaxSystemReturn => {
  const [quote, setQuote] = useState<TaxQuote | null>(null);
  const [stats, setStats] = useState<TaxStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Quote tax for an amount
   */
  const quoteTax = useCallback(async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.quoteTax(amount);
      setQuote(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to quote tax');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Collect tax from payer
   */
  const collectTax = useCallback(async (data: {
    payerAccountId: string;
    republicKey: string;
    asset: string;
    amount: string;
    privateKey: string;
  }): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.collectTax(data);
      return result.txHash;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to collect tax');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch tax statistics
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.getTaxStats();
      setStats(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get confederation account ID
   */
  const getConfederationAccount = useCallback(async (): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.getConfederationAccount();
      return result.accountId;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get confederation account');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get republic account ID
   */
  const getRepublicAccount = useCallback(async (republicKey: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.getRepublicAccount(republicKey);
      return result.accountId;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get republic account');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set republic account (admin)
   */
  const setRepublic = useCallback(async (data: {
    republicKey: string;
    republicAccountId: string;
    privateKey: string;
  }): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.setRepublic(data);
      return result.txHash;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set republic');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set collector permissions (admin)
   */
  const setCollector = useCallback(async (data: {
    collectorAddress: string;
    allowed: boolean;
    privateKey: string;
  }): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.setCollector(data);
      return result.txHash;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set collector');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if address is collector
   */
  const checkCollector = useCallback(async (address: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxApi.checkCollector(address);
      return result.isCollector;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check collector');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    quote,
    stats,
    loading,
    error,

    // Actions
    quoteTax,
    collectTax,
    fetchStats,
    getConfederationAccount,
    getRepublicAccount,
    setRepublic,
    setCollector,
    checkCollector,
  };
};
