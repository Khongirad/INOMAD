'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  cbApi,
  CBPublicStats,
  EmissionRecord,
  LicensedBank,
  CorrAccount,
  MonetaryPolicy,
} from '@/lib/central-bank/cb-api';

/**
 * useCentralBank hook.
 *
 * Manages Central Bank data with SEPARATE authentication from Bank and Auth.
 * Requires a CB ticket (from governor/board member wallet signature).
 *
 * FIREWALL: This hook NEVER uses auth JWTs or bank tickets.
 * CB data flows through /cb/* endpoints only.
 */
export function useCentralBank() {
  const [publicStats, setPublicStats] = useState<CBPublicStats | null>(null);
  const [supply, setSupply] = useState<{ minted: string; burned: string; circulating: string } | null>(null);
  const [dailyEmission, setDailyEmission] = useState<{ used: string; limit: string; remaining: string } | null>(null);
  const [emissionHistory, setEmissionHistory] = useState<EmissionRecord[]>([]);
  const [licensedBanks, setLicensedBanks] = useState<LicensedBank[]>([]);
  const [corrAccounts, setCorrAccounts] = useState<CorrAccount[]>([]);
  const [policy, setPolicy] = useState<MonetaryPolicy | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Check ticket on mount
  useEffect(() => {
    const valid = cbApi.hasValidTicket();
    setHasTicket(valid);
    if (valid) {
      const payload = cbApi.getTicketPayload();
      setRole(payload?.role || null);
    }
  }, []);

  // Fetch public stats (no auth required)
  const fetchPublicStats = useCallback(async () => {
    try {
      const stats = await cbApi.getPublicStats();
      setPublicStats(stats);
    } catch (e: any) {
      console.error('Failed to fetch public stats:', e);
    }
  }, []);

  // Fetch all authenticated data
  const fetchAll = useCallback(async () => {
    if (!cbApi.hasValidTicket()) {
      setHasTicket(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [supplyData, dailyData, historyData, banksData, corrData, policyData] = await Promise.all([
        cbApi.getSupply(),
        cbApi.getDailyEmission(),
        cbApi.getEmissionHistory(),
        cbApi.getLicensedBanks(),
        cbApi.getCorrAccounts(),
        cbApi.getCurrentPolicy(),
      ]);

      setSupply(supplyData);
      setDailyEmission(dailyData);
      setEmissionHistory(historyData);
      setLicensedBanks(banksData);
      setCorrAccounts(corrData);
      setPolicy(policyData);
    } catch (e: any) {
      if (e.message.includes('expired')) {
        setHasTicket(false);
        setRole(null);
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchPublicStats();
    if (hasTicket) {
      fetchAll();
    }
  }, [hasTicket, fetchPublicStats, fetchAll]);

  // Authentication
  const authenticate = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      await cbApi.authenticate(password);
      setHasTicket(true);
      const payload = cbApi.getTicketPayload();
      setRole(payload?.role || null);
      await fetchAll();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    cbApi.clearTicket();
    setHasTicket(false);
    setRole(null);
    setSupply(null);
    setDailyEmission(null);
    setEmissionHistory([]);
    setLicensedBanks([]);
    setCorrAccounts([]);
    setPolicy(null);
  };

  // Emission actions
  const emit = async (corrAccountId: string, amount: number, reason: string, memo?: string) => {
    setLoading(true);
    try {
      const result = await cbApi.emit(corrAccountId, amount, reason, memo);
      await fetchAll();
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const burn = async (corrAccountId: string, amount: number, reason: string) => {
    setLoading(true);
    try {
      const result = await cbApi.burn(corrAccountId, amount, reason);
      await fetchAll();
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // License actions
  const issueLicense = async (bankAddress: string, bankCode: string, bankName: string) => {
    setLoading(true);
    try {
      const result = await cbApi.issueLicense(bankAddress, bankCode, bankName);
      await fetchAll();
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const revokeLicense = async (licenseId: string, reason: string) => {
    setLoading(true);
    try {
      await cbApi.revokeLicense(licenseId, reason);
      await fetchAll();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Policy actions
  const updatePolicy = async (
    changes: { officialRate?: number; reserveRequirement?: number; dailyEmissionLimit?: number },
    reason: string,
  ) => {
    setLoading(true);
    try {
      const result = await cbApi.updatePolicy(changes, reason);
      await fetchAll();
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    publicStats,
    supply,
    dailyEmission,
    emissionHistory,
    licensedBanks,
    corrAccounts,
    policy,
    loading,
    error,
    hasTicket,
    role,
    isGovernor: role === 'GOVERNOR',

    // Auth
    authenticate,
    disconnect,

    // Actions
    emit,
    burn,
    issueLicense,
    revokeLicense,
    updatePolicy,

    // Refresh
    refresh: fetchAll,
    refreshPublicStats: fetchPublicStats,
  };
}
