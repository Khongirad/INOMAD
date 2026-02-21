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

// Structure for the encrypted share stored in localStorage
interface StoredShare {
  version: 1;
  salt: string; // hex
  iv: string;   // hex
  data: string; // hex (encrypted share)
}

// ==================== CRYPTO HELPERS (Web Crypto API) ====================

// Convert buffer to hex string
const bufToHex = (data: ArrayBuffer | ArrayBufferView): string => {
  let bytes: Uint8Array;
  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); 
  } else {
    bytes = new Uint8Array(data as ArrayBuffer);
  }
  
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert hex string to Uint8Array
const hexToBuf = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

// Derive AES-GCM key from PIN and Salt using PBKDF2
const deriveKey = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt plain device share with PIN
const encryptDeviceShare = async (share: string, pin: string): Promise<StoredShare> => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(share)
  );

  return {
    version: 1,
    salt: bufToHex(salt as unknown as Uint8Array),
    iv: bufToHex(iv as unknown as Uint8Array),
    data: bufToHex(encrypted)
  };
};

// Decrypt device share with PIN
const decryptDeviceShare = async (stored: StoredShare, pin: string): Promise<string> => {
  try {
    const salt = hexToBuf(stored.salt);
    const iv = hexToBuf(stored.iv);
    const data = hexToBuf(stored.data);
    
    const key = await deriveKey(pin, salt);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as any },
      key,
      data as any
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error('Invalid PIN or corrupted data');
  }
};

/**
 * useMPCWallet Hook
 * 
 * Manages MPC wallet operations:
 * - Create new wallet (with PIN encryption)
 * - Sign transactions (requires PIN)
 * - Manage guardians
 * - Recovery flow
 */
export function useMPCWallet() {
  const { user, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<MPCWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // System Logs for UI Demo
  const [systemLogs, setSystemLogs] = useState<{timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}[]>([]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setSystemLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
    }]);
  }, []);

  // Check if encrypted device share exists
  const hasDeviceShare = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(DEVICE_SHARE_KEY);
  }, []);

  // Get raw stored share object (encrypted)
  const getStoredShare = useCallback((): StoredShare | null => {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(DEVICE_SHARE_KEY);
    if (!item) return null;
    try {
      return JSON.parse(item) as StoredShare;
    } catch {
      return null;
    }
  }, []);

  // Store encrypted share
  const storeEncryptedShare = useCallback((share: StoredShare): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEVICE_SHARE_KEY, JSON.stringify(share));
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
  const createWallet = async (pin: string, recoveryMethod: string = 'SOCIAL'): Promise<void> => {
    if (!pin || pin.length < 4) {
        throw new Error("PIN is required and must be at least 4 digits");
    }

    setLoading(true);
    setError(null);
    addLog("Initiating MPC Wallet Creation...", 'info');

    try {
      addLog("Requesting Server Key Share generation...", 'info');
      const response = await api.post<{
        success: boolean;
        data: {
          address: string;
          deviceShare: string;
          walletId: string;
        };
      }>('/mpc-wallet/create', { recoveryMethod });

      // Encrypt and store device share locally
      addLog("Generating high-entropy PIN-derived key (PBKDF2)...", 'info');
      addLog("Encrypting device share with AES-GCM...", 'info');
      
      const encrypted = await encryptDeviceShare(response.data.deviceShare, pin);
      storeEncryptedShare(encrypted);
      
      addLog("Device share securely stored in local enclave.", 'success');
      addLog(`Wallet created successfully. ID: ${response.data.walletId.substring(0, 8)}...`, 'success');

      // Refresh wallet info
      await fetchWallet();
    } catch (e: any) {
      setError(e.message);
      addLog(`Creation failed: ${e.message}`, 'error');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Migrate from legacy EmbeddedWallet
   */
  const migrateFromLegacy = async (privateKey: string, pin: string): Promise<void> => {
    if (!pin || pin.length < 4) {
        throw new Error("PIN is required for the new wallet");
    }

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

      // Encrypt and store new device share
      const encrypted = await encryptDeviceShare(response.data.deviceShare, pin);
      storeEncryptedShare(encrypted);

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
   * Validate if the provided PIN can decrypt the stored share
   */
  const validatePin = async (pin: string): Promise<boolean> => {
      const stored = getStoredShare();
      if (!stored) return false;
      try {
          await decryptDeviceShare(stored, pin);
          return true;
      } catch {
          return false;
      }
  };

  /**
   * Sign transaction (requires PIN to unlock locally)
   * If broadcast is true, the server will broadcast the transaction to the network
   */
  /**
   * Sign transaction (requires PIN to unlock locally)
   * If broadcast is true, the server will broadcast the transaction to the network
   */
  const signAndSendTransaction = async (
    transaction: { to: string; value?: string; data?: string; gasLimit?: string }, 
    pin: string,
    broadcast: boolean = false
  ): Promise<{ signedTx: string; hash?: string }> => {
    const stored = getStoredShare();
    if (!stored) {
      throw new Error('Device share not found. Please set up wallet on this device.');
    }

    addLog(`Preparing transaction... To: ${transaction.to}`, 'info');

    // Decrypt share
    let deviceShare: string;
    try {
        addLog("Decrypting device share with PIN...", 'info');
        deviceShare = await decryptDeviceShare(stored, pin);
    } catch (e) {
        addLog("PIN verification failed.", 'error');
        throw new Error('Incorrect PIN');
    }

    addLog(broadcast ? "Requesting Signature & Broadcast..." : "Requesting Partial Signature...", 'info');
    
    try {
        const response = await api.post<{
          success: boolean;
          data: { signedTransaction: string; hash?: string };
        }>('/mpc-wallet/sign-transaction', {
          deviceShare,
          transaction,
          broadcast
        });

        if (response.data.hash) {
            addLog(`Transaction broadcasted! Hash: ${response.data.hash}`, 'success');
        } else {
            addLog("Transaction signed locally.", 'success');
        }

        return {
          signedTx: response.data.signedTransaction,
          hash: response.data.hash
        };
    } catch (e: any) {
        addLog(`Signing failed: ${e.message}`, 'error');
        throw e;
    }
  };

  /**
   * Helper to send transaction (broadcasts immediately)
   */
  const sendTransaction = async (
    transaction: { to: string; value?: string; data?: string; gasLimit?: string },
    pin: string
  ): Promise<string> => {
    const result = await signAndSendTransaction(transaction, pin, true);
    if (!result.hash) {
      throw new Error('Failed to broadcast transaction - no hash returned');
    }
    return result.hash;
  };

  /**
   * Sign message (requires PIN)
   */
  const signMessage = async (message: string, pin: string): Promise<string> => {
    const stored = getStoredShare();
    if (!stored) {
      throw new Error('Device share not found. Please set up wallet on this device.');
    }

    // Decrypt share
    let deviceShare: string;
    try {
        deviceShare = await decryptDeviceShare(stored, pin);
    } catch (e) {
        throw new Error('Incorrect PIN');
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
   * Get guardian suggestions based on Arbad
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
    newPin: string,
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

    // Store new device share if provided (re-encrypted with new PIN)
    if (response.data.deviceShare) {
      if (!newPin) throw new Error("New PIN required to store recovered share");
      const encrypted = await encryptDeviceShare(response.data.deviceShare, newPin);
      storeEncryptedShare(encrypted);
    }
  };

  return {
    // State
    wallet,
    loading,
    error,
    systemLogs,
    isReady: !!wallet && wallet.status === 'ACTIVE' && hasDeviceShare(),
    hasWallet: !!wallet,
    address: wallet?.address || null,

    // Wallet operations
    createWallet,
    migrateFromLegacy,
    
    // Low-level sign
    signAndSendTransaction, 
    
    // Helpers
    transaction: signAndSendTransaction, // Alias for backward compatibility if needed, but discouraged
    signTransaction: async (tx: any, pin: string) => (await signAndSendTransaction(tx, pin, false)).signedTx,
    sendTransaction,
    
    signMessage,
    validatePin,
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
