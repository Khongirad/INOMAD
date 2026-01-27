import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { EmbeddedWallet } from '@/lib/wallet/embedded';

export function useAltan() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Initialize Wallet State
  useEffect(() => {
    // 1. Check for Embedded Wallet first (Doctrine: Native Wallet)
    const nativeAddress = EmbeddedWallet.getAddress();
    if (nativeAddress) {
       setWalletAddress(nativeAddress);
    }
    
    // 2. Get User/Seat ID
    const storedSeat = api.getSeatId();
    if (storedSeat) {
      setUserId(storedSeat); 
    }
  }, []);

  // Fetch Altan Data
  useEffect(() => {
    if (!userId) return;

    const fetchAltan = async () => {
      try {
        const bal = await api.get<number>(`altan/balance/${userId}`);
        setBalance(bal);

        const hist = await api.get<any[]>(`altan/history/${userId}`);
        setHistory(hist);
      } catch (error) {
        console.warn('Altan fetch failed or backend offline:', error);
      }
    };

    fetchAltan();
  }, [userId]);

  const transfer = async (recipientIdentifier: string, amount: number) => {
    if (!userId) throw new Error("Not authenticated");
    
    // In strict doctrine, we would require EmbeddedWallet.unlock(password) here to sign
    // For MVP, we allow the "Soft API" transfer if the session is authenticated
    // But we SHOULD eventually prompt for the PIN
    
    return api.post('altan/transfer', {
      fromUserId: userId,
      recipientIdentifier, // Can be Seat ID or Wallet Address
      amount
    });
  };

  const resolveRecipient = async (identifier: string) => {
     return api.post('altan/resolve-user', { identifier });
  };

  return {
    balance,
    history,
    walletAddress,
    transfer,
    resolveRecipient
  };
}
