import { ethers } from 'ethers';
import { api } from '@/lib/api';

const STORAGE_KEY_WALLET = 'inomad_wallet_enc';
const STORAGE_KEY_CONFIG = 'inomad_wallet_config';

interface WalletConfig {
  address: string;
  isUnlocked: boolean;
  activationStatus: 'PENDING' | 'ACTIVE' | 'FROZEN';
}

export const EmbeddedWallet = {
  /**
   * Check if a wallet exists in local storage
   */
  exists: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem(STORAGE_KEY_WALLET);
  },

  /**
   * Get public address if wallet exists
   */
  getAddress: (): string | null => {
    if (typeof window === 'undefined') return null;
    const configStr = window.localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!configStr) return null;
    try {
      const config = JSON.parse(configStr) as WalletConfig;
      return config.address;
    } catch { return null; }
  },

  /**
   * Create a new random wallet and encrypt it with a pin/password
   */
  create: async (password: string): Promise<string> => {
    const wallet = ethers.Wallet.createRandom();
    const encryptedJson = await wallet.encrypt(password);
    
    // Store Encrypted Key
    window.localStorage.setItem(STORAGE_KEY_WALLET, encryptedJson);
    
    // Store Config (Public State)
    const config: WalletConfig = {
      address: wallet.address,
      isUnlocked: false,
      activationStatus: 'PENDING' // Default lock state per Doctrine
    };
    window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));

    return wallet.address;
  },

  /**
   * Unlock the wallet temporarily (in memory) for a session
   */
  unlock: async (password: string): Promise<ethers.Wallet | ethers.HDNodeWallet> => {
    const encryptedJson = window.localStorage.getItem(STORAGE_KEY_WALLET);
    if (!encryptedJson) throw new Error("No wallet found");

    try {
      // Ethers 6.x: Wallet.fromEncryptedJson(json, password)
      // Note: This operation is CPU intensive (scrypt)
      const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
      
      // Update State
      const configStr = window.localStorage.getItem(STORAGE_KEY_CONFIG);
      if (configStr) {
        const config = JSON.parse(configStr);
        config.isUnlocked = true;
        window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      }
      
      return wallet;
    } catch (e) {
      throw new Error("Invalid password or corrupted wallet");
    }
  },

  /**
   * Query backend for wallet activation status.
   * Falls back to localStorage if API is unavailable.
   */
  checkActivation: async (): Promise<'PENDING' | 'ACTIVE'> => {
    const seatId = api.getSeatId();
    if (seatId) {
      try {
        const data = await api.get<{ walletStatus: string }>(`identity/status/${seatId}`);
        const status = data.walletStatus === 'UNLOCKED' ? 'ACTIVE' : 'PENDING';
        // Sync localStorage config
        const configStr = window.localStorage.getItem(STORAGE_KEY_CONFIG);
        if (configStr) {
          const config = JSON.parse(configStr);
          config.activationStatus = status;
          window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
        }
        return status;
      } catch {
        // Fall through to localStorage fallback
      }
    }
    const configStr = window.localStorage.getItem(STORAGE_KEY_CONFIG);
    if (configStr) {
      const config = JSON.parse(configStr);
      return config.activationStatus === 'ACTIVE' ? 'ACTIVE' : 'PENDING';
    }
    return 'PENDING';
  }
};
