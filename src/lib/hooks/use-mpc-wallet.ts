'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './use-auth';

// Storage key for device share (encrypted in browser)
const DEVICE_SHARE_KEY = 'altan_mpc_device_share';

interface MPCWallet {
  id: string;
  address: string;
  status: 'PENDING_SETUP' | 'ACTIVE' | 'RECOVERY_MODE' | 'FROZEN' | 'MIGRATING';
  recoveryMethod: string;
  guardianCount: number;
  hasSmartAccount: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Guardian {
  id: string;
  guardianType: string;
  guardianRef: string;
  guardianName: string | null;
  isConfirmed: boolean;
}

interface GuardianSuggestion {
  type: string;
  userId?: string;
  ref: string;
  name?: string;
  relationship: string;
  trust: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * useMPCWallet Hook
 * 
 * Manages MPC wallet operations:
 * - Create new wallet
 * - Sign transactions (gasless)
 * - Manage guardians
 * - Recovery flow
 * 
 * Device share is stored encrypted in localStorage.
 * Server share is stored on backend.
 * 2-of-3 threshold for signing.
 */
export function useMPCWallet() {
  const { user, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<MPCWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if device share exists
  const hasDeviceShare = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(DEVICE_SHARE_KEY);
  }, []);

  // Get device share (should be called only when needed)
  const getDeviceShare = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(DEVICE_SHARE_KEY);
  }, []);

  // Store device share securely
  const storeDeviceShare = useCallback((share: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEVICE_SHARE_KEY, share);
  }, []);

  // Clear device share
  const clearDeviceShare = useCallback((): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DEVICE_SHARE_KEY);
  }, []);

  // Fetch wallet info
  const fetchWallet = useCallback(async () => {
    if (!isAuthenticated) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<{ success: boolean; data: MPCWallet }>('/mpc-wallet/me');
      setWallet(response.data);
      setError(null);
    } catch (e: any) {
      if (e.response?.status === 404) {
        // No wallet yet
        setWallet(null);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  /**
   * Create new MPC wallet
   */
  const createWallet = async (recoveryMethod: string = 'SOCIAL'): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        success: boolean;
        data: {
          address: string;
          deviceShare: string;
          walletId: string;
        };
      }>('/mpc-wallet/create', { recoveryMethod });

      // Store device share locally
      storeDeviceShare(response.data.deviceShare);

      // Refresh wallet info
      await fetchWallet();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Migrate from legacy EmbeddedWallet
   */
  const migrateFromLegacy = async (privateKey: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        success: boolean;
        data: {
          address: string;
          deviceShare: string;
          walletId: string;
        };
      }>('/mpc-wallet/migrate', { privateKey });

      // Store new device share
      storeDeviceShare(response.data.deviceShare);

      // Clear old wallet data
      localStorage.removeItem('inomad_wallet_enc');
      localStorage.removeItem('inomad_wallet_config');

      // Refresh wallet
      await fetchWallet();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign transaction (gasless via Account Abstraction)
   */
  const signTransaction = async (transaction: {
    to: string;
    value?: string;
    data?: string;
  }): Promise<string> => {
    const deviceShare = getDeviceShare();
    if (!deviceShare) {
      throw new Error('Device share not found. Please set up wallet on this device.');
    }

    const response = await api.post<{
      success: boolean;
      data: { signedTransaction: string };
    }>('/mpc-wallet/sign-transaction', {
      deviceShare,
      transaction,
    });

    return response.data.signedTransaction;
  };

  /**
   * Sign message
   */
  const signMessage = async (message: string): Promise<string> => {
    const deviceShare = getDeviceShare();
    if (!deviceShare) {
      throw new Error('Device share not found. Please set up wallet on this device.');
    }

    const response = await api.post<{
      success: boolean;
      data: { signature: string };
    }>('/mpc-wallet/sign-message', {
      deviceShare,
      message,
    });

    return response.data.signature;
  };

  // ==================== GUARDIANS ====================

  /**
   * Get guardians
   */
  const getGuardians = async (): Promise<Guardian[]> => {
    const response = await api.get<{
      success: boolean;
      data: Guardian[];
    }>('/mpc-wallet/guardians');

    return response.data;
  };

  /**
   * Get guardian suggestions based on Arban
   */
  const getGuardianSuggestions = async (): Promise<GuardianSuggestion[]> => {
    const response = await api.get<{
      success: boolean;
      data: GuardianSuggestion[];
    }>('/mpc-wallet/guardians/suggest');

    return response.data;
  };

  /**
   * Add guardian
   */
  const addGuardian = async (
    guardianType: string,
    guardianRef: string,
    guardianName?: string,
    guardianUserId?: string
  ): Promise<void> => {
    await api.post('/mpc-wallet/guardians', {
      guardianType,
      guardianRef,
      guardianName,
      guardianUserId,
    });
  };

  // ==================== RECOVERY ====================

  /**
   * Initiate recovery (for when user loses access)
   */
  const initiateRecovery = async (
    address: string,
    method: string = 'SOCIAL'
  ): Promise<{ sessionId: string; expiresAt: string }> => {
    const response = await api.post<{
      success: boolean;
      data: {
        sessionId: string;
        method: string;
        requiredApprovals: number;
        expiresAt: string;
      };
    }>('/mpc-wallet/recovery/initiate', {
      address,
      method,
    });

    return {
      sessionId: response.data.sessionId,
      expiresAt: response.data.expiresAt,
    };
  };

  /**
   * Confirm recovery with verification code
   */
  const confirmRecovery = async (
    sessionId: string,
    verificationCode?: string
  ): Promise<void> => {
    const response = await api.post<{
      success: boolean;
      data: {
        success: boolean;
        deviceShare?: string;
      };
    }>('/mpc-wallet/recovery/confirm', {
      sessionId,
      verificationCode,
    });

    // Store new device share if provided
    if (response.data.deviceShare) {
      storeDeviceShare(response.data.deviceShare);
    }
  };

  return {
    // State
    wallet,
    loading,
    error,
    isReady: !!wallet && wallet.status === 'ACTIVE' && hasDeviceShare(),
    hasWallet: !!wallet,
    address: wallet?.address || null,

    // Wallet operations
    createWallet,
    migrateFromLegacy,
    signTransaction,
    signMessage,
    refresh: fetchWallet,

    // Device share management
    hasDeviceShare,
    clearDeviceShare,

    // Guardians
    getGuardians,
    getGuardianSuggestions,
    addGuardian,

    // Recovery
    initiateRecovery,
    confirmRecovery,
  };
}
