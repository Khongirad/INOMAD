'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { EmbeddedWallet } from '@/lib/wallet/embedded';

interface LegacyWallet {
  exists: boolean;
  address: string | null;
  isUnlocked: boolean;
}

/**
 * useLegacyWallet Hook
 * 
 * React wrapper around the legacy EmbeddedWallet system.
 * Provides interface compatible with useMPCWallet for unified access.
 */
export function useLegacyWallet() {
  const [state, setState] = useState<LegacyWallet>({
    exists: false,
    address: null,
    isUnlocked: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Keep unlocked wallet in memory for session
  const walletRef = useRef<ethers.Wallet | ethers.HDNodeWallet | null>(null);

  // Initialize state
  useEffect(() => {
    const exists = EmbeddedWallet.exists();
    const address = EmbeddedWallet.getAddress();
    
    setState({
      exists,
      address,
      isUnlocked: false, // Reset on mount
    });
    setLoading(false);
  }, []);

  /**
   * Create new legacy wallet
   */
  const create = useCallback(async (password: string): Promise<string> => {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    setLoading(true);
    setError(null);

    try {
      const address = await EmbeddedWallet.create(password);
      setState({
        exists: true,
        address,
        isUnlocked: false,
      });
      return address;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Unlock wallet with password (loads into memory)
   */
  const unlock = useCallback(async (password: string): Promise<void> => {
    if (!state.exists) {
      throw new Error('No wallet found');
    }

    setLoading(true);
    setError(null);

    try {
      const wallet = await EmbeddedWallet.unlock(password);
      walletRef.current = wallet;
      
      setState(prev => ({
        ...prev,
        isUnlocked: true,
      }));
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [state.exists]);

  /**
   * Lock wallet (clear from memory)
   */
  const lock = useCallback(() => {
    walletRef.current = null;
    setState(prev => ({
      ...prev,
      isUnlocked: false,
    }));
  }, []);

  /**
   * Sign transaction
   * If wallet is unlocked, uses cached instance.
   * Otherwise, temporarily unlocks with password.
   */
  const signTransaction = useCallback(async (
    transaction: {
      to: string;
      value?: string;
      data?: string;
      gasLimit?: string;
      gasPrice?: string;
      nonce?: number;
    },
    password: string
  ): Promise<string> => {
    let wallet = walletRef.current;

    // If not unlocked, temporarily unlock
    if (!wallet) {
      wallet = await EmbeddedWallet.unlock(password);
    }

    // Create proper transaction object
    const tx: ethers.TransactionRequest = {
      to: transaction.to,
      value: transaction.value ? ethers.parseEther(transaction.value) : undefined,
      data: transaction.data,
      gasLimit: transaction.gasLimit ? BigInt(transaction.gasLimit) : undefined,
      gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : undefined,
      nonce: transaction.nonce,
    };

    const signedTx = await wallet.signTransaction(tx);
    return signedTx;
  }, []);

  /**
   * Send transaction (sign + broadcast)
   * Requires RPC provider
   */
  const sendTransaction = useCallback(async (
    transaction: {
      to: string;
      value?: string;
      data?: string;
      gasLimit?: string;
    },
    password: string,
    rpcUrl: string = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
  ): Promise<string> => {
    let wallet = walletRef.current;

    // If not unlocked, temporarily unlock
    if (!wallet) {
      wallet = await EmbeddedWallet.unlock(password);
    }

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const connectedWallet = wallet.connect(provider);

    // Create transaction
    const tx: ethers.TransactionRequest = {
      to: transaction.to,
      value: transaction.value ? ethers.parseEther(transaction.value) : undefined,
      data: transaction.data,
      gasLimit: transaction.gasLimit ? BigInt(transaction.gasLimit) : undefined,
    };

    // Send transaction
    const txResponse = await connectedWallet.sendTransaction(tx);
    return txResponse.hash;
  }, []);

  /**
   * Sign message
   */
  const signMessage = useCallback(async (
    message: string,
    password: string
  ): Promise<string> => {
    let wallet = walletRef.current;

    // If not unlocked, temporarily unlock
    if (!wallet) {
      wallet = await EmbeddedWallet.unlock(password);
    }

    return wallet.signMessage(message);
  }, []);

  /**
   * Export private key (for migration to MPC wallet)
   * **SECURITY WARNING:** Only use this for migration purposes
   */
  const exportPrivateKey = useCallback(async (password: string): Promise<string> => {
    const wallet = await EmbeddedWallet.unlock(password);
    return wallet.privateKey;
  }, []);

  /**
   * Check wallet activation status
   */
  const checkActivation = useCallback(async (): Promise<'PENDING' | 'ACTIVE'> => {
    return EmbeddedWallet.checkActivation();
  }, []);

  /**
   * Get wallet balance (requires RPC)
   */
  const getBalance = useCallback(async (
    rpcUrl: string = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
  ): Promise<string> => {
    if (!state.address) {
      throw new Error('No wallet address');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(state.address);
    return ethers.formatEther(balance);
  }, [state.address]);

  return {
    // State
    ...state,       // exists, address, isUnlocked
    loading,
    error,
    walletType: 'legacy' as const,

    // Operations
    create,
    unlock,
    lock,
    signTransaction,
    sendTransaction,
    signMessage,
    
    // Migration support
    exportPrivateKey,
    
    // Utilities
    checkActivation,
    getBalance,
  };
}
