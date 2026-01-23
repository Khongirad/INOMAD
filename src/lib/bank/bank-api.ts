import { EmbeddedWallet } from '@/lib/wallet/embedded';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const STORAGE_BANK_TICKET = 'inomad_bank_ticket';

interface BankTicketResponse {
  ok: boolean;
  bankTicket: string;
  expiresIn: number;
}

interface BankBalanceResponse {
  ok: boolean;
  balance: string;
  lastSyncedAt: string | null;
}

interface BankHistoryResponse {
  ok: boolean;
  transactions: BankTransaction[];
}

export interface BankTransaction {
  id: string;
  amount: string;
  type: string;
  status: string;
  txHash: string | null;
  memo: string | null;
  createdAt: string;
  direction: 'IN' | 'OUT';
  counterpartyBankRef: string;
}

interface BankTransferResponse {
  ok: boolean;
  transactionId: string;
  amount: string;
  fee: string;
  status: string;
}

/**
 * Bank API Client.
 *
 * Provides access to banking operations with SEPARATE authentication.
 * Uses bank tickets (NOT auth JWTs) — requires a fresh wallet signature
 * with the message "Bank of Siberia: ${nonce}".
 *
 * FIREWALL: Banking data never flows through the auth session.
 * Compromise of auth tokens does NOT give bank access.
 */
export const bankApi = {
  /**
   * Get stored bank ticket.
   */
  getTicket: (): string | null => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_BANK_TICKET);
  },

  /**
   * Check if bank ticket is still valid.
   */
  hasValidTicket: (): boolean => {
    const ticket = bankApi.getTicket();
    if (!ticket) return false;
    try {
      const payload = JSON.parse(atob(ticket.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  /**
   * Clear bank ticket.
   */
  clearTicket: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_BANK_TICKET);
  },

  /**
   * Authenticate with the bank — requires a SEPARATE wallet signature.
   *
   * This is independent from the auth login flow:
   * - Different nonce
   * - Different message ("Bank of Siberia: ..." vs "Sign in to INOMAD: ...")
   * - Different JWT secret on backend
   */
  authenticate: async (password: string): Promise<string> => {
    // 1. Unlock wallet
    const wallet = await EmbeddedWallet.unlock(password);
    const address = wallet.address;

    // 2. Request BANK nonce (separate endpoint)
    const nonceRes = await fetch(`${API_BASE_URL}/bank/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (!nonceRes.ok) {
      const err = await nonceRes.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to request bank nonce');
    }

    const { nonce, message } = await nonceRes.json();

    // 3. Sign the BANK-specific message
    const signature = await wallet.signMessage(message);

    // 4. Get bank ticket
    const ticketRes = await fetch(`${API_BASE_URL}/bank/auth/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, nonce }),
    });

    if (!ticketRes.ok) {
      const err = await ticketRes.json().catch(() => ({}));
      throw new Error(err.message || 'Bank authentication failed');
    }

    const data: BankTicketResponse = await ticketRes.json();

    // 5. Store bank ticket
    window.localStorage.setItem(STORAGE_BANK_TICKET, data.bankTicket);
    return data.bankTicket;
  },

  /**
   * Get balance. Requires valid bank ticket.
   */
  getBalance: async (): Promise<{ balance: string; lastSyncedAt: string | null }> => {
    const ticket = bankApi.getTicket();
    if (!ticket) throw new Error('No bank ticket. Authenticate first.');

    const res = await fetch(`${API_BASE_URL}/bank/me/balance`, {
      headers: { 'x-bank-ticket': ticket },
    });

    if (!res.ok) {
      if (res.status === 401) {
        bankApi.clearTicket();
        throw new Error('Bank ticket expired. Re-authenticate.');
      }
      throw new Error('Failed to fetch balance');
    }

    const data: BankBalanceResponse = await res.json();
    return { balance: data.balance, lastSyncedAt: data.lastSyncedAt };
  },

  /**
   * Get transaction history. Requires valid bank ticket.
   */
  getHistory: async (limit = 50): Promise<BankTransaction[]> => {
    const ticket = bankApi.getTicket();
    if (!ticket) throw new Error('No bank ticket. Authenticate first.');

    const res = await fetch(`${API_BASE_URL}/bank/me/history?limit=${limit}`, {
      headers: { 'x-bank-ticket': ticket },
    });

    if (!res.ok) {
      if (res.status === 401) {
        bankApi.clearTicket();
        throw new Error('Bank ticket expired. Re-authenticate.');
      }
      throw new Error('Failed to fetch history');
    }

    const data: BankHistoryResponse = await res.json();
    return data.transactions;
  },

  /**
   * Transfer funds. Requires valid bank ticket.
   */
  transfer: async (recipientBankRef: string, amount: number, memo?: string): Promise<BankTransferResponse> => {
    const ticket = bankApi.getTicket();
    if (!ticket) throw new Error('No bank ticket. Authenticate first.');

    const res = await fetch(`${API_BASE_URL}/bank/me/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bank-ticket': ticket,
      },
      body: JSON.stringify({ recipientBankRef, amount, memo }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        bankApi.clearTicket();
        throw new Error('Bank ticket expired. Re-authenticate.');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Transfer failed');
    }

    return res.json();
  },

  /**
   * Resolve a bankRef to check if it's valid.
   */
  resolve: async (bankRef: string): Promise<{ exists: boolean; bankCode: string | null }> => {
    const ticket = bankApi.getTicket();
    if (!ticket) throw new Error('No bank ticket. Authenticate first.');

    const res = await fetch(`${API_BASE_URL}/bank/me/resolve?bankRef=${encodeURIComponent(bankRef)}`, {
      headers: { 'x-bank-ticket': ticket },
    });

    if (!res.ok) throw new Error('Failed to resolve bankRef');
    const data = await res.json();
    return { exists: data.exists, bankCode: data.bankCode };
  },
};
