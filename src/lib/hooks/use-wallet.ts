'use client';

import { useLegacyWallet } from './use-legacy-wallet';
import { useMPCWallet } from './use-mpc-wallet';

export type WalletType = 'mpc' | 'legacy' | null;

export interface UnifiedWalletState {
  // Identity
  hasWallet: boolean;
  address: string | null;
  walletType: WalletType;
  
  // Status
  isReady: boolean;  // Can sign transactions right now
  needsMigration: boolean;
  loading: boolean;
  error: string | null;
  
  // Type-specific access
  mpc: ReturnType<typeof useMPCWallet>;
  legacy: ReturnType<typeof useLegacyWallet>;
}

export interface UnifiedWalletOperations {
  // Operations (adapts based on wallet type)
  signTransaction(tx: any, auth: string): Promise<string>;
  sendTransaction(tx: any, auth: string): Promise<string>;
  signMessage(message: string, auth: string): Promise<string>;
  
  // Migration
  canMigrate: boolean;
  startMigration(oldPassword: string, newPin: string): Promise<void>;
}

/**
 * useWallet Hook
 * 
 * Unified interface for both MPC and Legacy wallets.
 * Automatically detects which wallet system the user has and provides
 * a consistent API regardless of the underlying implementation.
 * 
 * Priority:
 * 1. MPC wallet (if exists)
 * 2. Legacy wallet (if exists)
 * 3. No wallet (null)
 */
export function useWallet() {
  const mpc = useMPCWallet();
  const legacy = useLegacyWallet();

  // Determine active wallet type
  // Priority: MPC > Legacy > None
  const walletType: WalletType = mpc.hasWallet ? 'mpc' : (legacy.exists ? 'legacy' : null);
  
  const hasWallet = walletType !== null;
  const needsMigration = walletType === 'legacy';
  const canMigrate = legacy.exists && !mpc.hasWallet;

  // Unified address
  const address = mpc.address || legacy.address;

  // isReady: Can perform signing operations immediately
  // - MPC: wallet is ACTIVE and has device share
  // - Legacy: wallet is unlocked
  const isReady = walletType === 'mpc' 
    ? mpc.isReady 
    : (walletType === 'legacy' ? legacy.isUnlocked : false);

  // Combined loading state
  const loading = mpc.loading || legacy.loading;

  // Combined error (prefer MPC error if both exist)
  const error = mpc.error || legacy.error;

  /**
   * Sign transaction
   * Routes to appropriate wallet based on type
   * 
   * @param tx - Transaction object
   * @param auth - PIN (MPC) or Password (Legacy)
   */
  const signTransaction = async (tx: any, auth: string): Promise<string> => {
    if (walletType === 'mpc') {
      return mpc.signTransaction(tx, auth);
    } else if (walletType === 'legacy') {
      return legacy.signTransaction(tx, auth);
    } else {
      throw new Error('No wallet available');
    }
  };

  /**
   * Send transaction (sign + broadcast)
   * 
   * @param tx - Transaction object
   * @param auth - PIN (MPC) or Password (Legacy)
   */
  const sendTransaction = async (tx: any, auth: string): Promise<string> => {
    if (walletType === 'mpc') {
      return mpc.sendTransaction(tx, auth);
    } else if (walletType === 'legacy') {
      return legacy.sendTransaction(tx, auth);
    } else {
      throw new Error('No wallet available');
    }
  };

  /**
   * Sign message
   * 
   * @param message - Message to sign
   * @param auth - PIN (MPC) or Password (Legacy)
   */
  const signMessage = async (message: string, auth: string): Promise<string> => {
    if (walletType === 'mpc') {
      return mpc.signMessage(message, auth);
    } else if (walletType === 'legacy') {
      return legacy.signMessage(message, auth);
    } else {
      throw new Error('No wallet available');
    }
  };

  /**
   * Start migration from Legacy to MPC
   * 
   * @param oldPassword - Password for legacy wallet
   * @param newPin - PIN for new MPC wallet
   */
  const startMigration = async (oldPassword: string, newPin: string): Promise<void> => {
    if (!canMigrate) {
      throw new Error('Cannot migrate: either no legacy wallet or MPC wallet already exists');
    }

    // Step 1: Export private key from legacy wallet
    const privateKey = await legacy.exportPrivateKey(oldPassword);

    // Step 2: Call MPC migration
    await mpc.migrateFromLegacy(privateKey, newPin);

    // Step 3: Lock legacy wallet (clear from memory)
    legacy.lock();

    // Migration complete - wallet state will update via hooks
  };

  /**
   * Get auth field label for UI
   * Returns appropriate label based on wallet type
   */
  const getAuthLabel = (): string => {
    if (walletType === 'mpc') return 'PIN';
    if (walletType === 'legacy') return 'Password';
    return 'Auth';
  };

  /**
   * Get auth field placeholder
   */
  const getAuthPlaceholder = (): string => {
    if (walletType === 'mpc') return 'Enter your 6-digit PIN';
    if (walletType === 'legacy') return 'Enter your password';
    return '';
  };

  /**
   * Validate auth input
   */
  const validateAuth = async (auth: string): Promise<boolean> => {
    if (walletType === 'mpc') {
      return mpc.validatePin(auth);
    } else if (walletType === 'legacy') {
      // For legacy, we'd need to try unlock - not ideal
      // Better to just check length
      return auth.length >= 8;
    }
    return false;
  };

  return {
    // State
    hasWallet,
    address,
    walletType,
    isReady,
    needsMigration,
    loading,
    error,

    // Type-specific access
    mpc,
    legacy,

    // Unified operations
    signTransaction,
    sendTransaction,
    signMessage,

    // Migration
    canMigrate,
    startMigration,

    // UI helpers
    getAuthLabel,
    getAuthPlaceholder,
    validateAuth,
  };
}
