'use client';

import { useState, useEffect, useCallback } from 'react';
import { bankApi, BankTransaction } from '@/lib/bank/bank-api';

/**
 * useBank hook.
 *
 * Manages banking data with SEPARATE authentication from identity.
 * Requires a bank ticket (from wallet signature on bank-specific message).
 *
 * FIREWALL: This hook NEVER uses auth JWT tokens.
 * Banking data flows through /bank/* endpoints only.
 */
export function useBank() {
  const [balance, setBalance] = useState<string>('0');
  const [history, setHistory] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    setHasTicket(bankApi.hasValidTicket());
  }, []);

  const authenticate = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      await bankApi.authenticate(password);
      setHasTicket(true);
      await fetchBalance();
      await fetchHistory();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = useCallback(async () => {
    if (!bankApi.hasValidTicket()) {
      setHasTicket(false);
      return;
    }
    try {
      const data = await bankApi.getBalance();
      setBalance(data.balance);
      setError(null);
    } catch (e: any) {
      if (e.message.includes('expired')) {
        setHasTicket(false);
      }
      setError(e.message);
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 50) => {
    if (!bankApi.hasValidTicket()) {
      setHasTicket(false);
      return;
    }
    try {
      const transactions = await bankApi.getHistory(limit);
      setHistory(transactions);
      setError(null);
    } catch (e: any) {
      if (e.message.includes('expired')) {
        setHasTicket(false);
      }
      setError(e.message);
    }
  }, []);

  const transfer = async (recipientBankRef: string, amount: number, memo?: string) => {
    if (!bankApi.hasValidTicket()) {
      throw new Error('Bank ticket expired. Re-authenticate.');
    }
    const result = await bankApi.transfer(recipientBankRef, amount, memo);
    // Refresh balance after transfer
    await fetchBalance();
    await fetchHistory();
    return result;
  };

  const disconnect = () => {
    bankApi.clearTicket();
    setHasTicket(false);
    setBalance('0');
    setHistory([]);
  };

  // Auto-fetch on mount if ticket exists
  useEffect(() => {
    if (hasTicket) {
      fetchBalance();
      fetchHistory();
    }
  }, [hasTicket, fetchBalance, fetchHistory]);

  return {
    balance,
    history,
    loading,
    error,
    hasTicket,
    authenticate,
    fetchBalance,
    fetchHistory,
    transfer,
    disconnect,
  };
}
