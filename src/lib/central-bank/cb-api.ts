import { EmbeddedWallet } from '@/lib/wallet/embedded';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const STORAGE_CB_TICKET = 'inomad_cb_ticket';

export interface CBPublicStats {
  totalSupply: string;
  totalMinted: string;
  totalBurned: string;
  licensedBanksCount: number;
  officialRate: string;
  lastEmissionDate: string | null;
}

export interface EmissionRecord {
  id: string;
  type: 'MINT' | 'BURN';
  amount: string;
  reason: string;
  memo: string | null;
  bankCode: string | null;
  bankName: string | null;
  authorizedBy: string | null;
  status: string;
  createdAt: string;
}

export interface LicensedBank {
  id: string;
  bankAddress: string;
  bankCode: string;
  bankName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  issuedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  issuedBy: string | null;
  corrAccount: {
    id: string;
    accountRef: string;
    balance: string;
  } | null;
}

export interface CorrAccount {
  id: string;
  accountRef: string;
  balance: string;
  bankCode: string;
  bankName: string;
  bankStatus: string;
  updatedAt: string;
}

export interface MonetaryPolicy {
  id?: string;
  officialRate: string;
  reserveRequirement: string;
  dailyEmissionLimit: string;
  effectiveFrom: string;
}

export interface PolicyChange {
  id: string;
  parameter: string;
  previousValue: string;
  newValue: string;
  reason: string | null;
  authorizedBy: string | null;
  effectiveAt: string;
}

/**
 * Central Bank API Client.
 *
 * Separate auth domain from Bank API and Auth API.
 * Uses CB tickets (NOT bank tickets or auth JWTs).
 * Message format: "Central Bank of Siberia: ${nonce}"
 */
export const cbApi = {
  // ============================
  // TICKET MANAGEMENT
  // ============================

  getTicket: (): string | null => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_CB_TICKET);
  },

  hasValidTicket: (): boolean => {
    const ticket = cbApi.getTicket();
    if (!ticket) return false;
    try {
      const payload = JSON.parse(atob(ticket.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  clearTicket: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_CB_TICKET);
  },

  getTicketPayload: (): { officerId: string; walletAddress: string; role: string } | null => {
    const ticket = cbApi.getTicket();
    if (!ticket) return null;
    try {
      return JSON.parse(atob(ticket.split('.')[1]));
    } catch {
      return null;
    }
  },

  // ============================
  // AUTHENTICATION
  // ============================

  authenticate: async (password: string): Promise<string> => {
    // 1. Unlock wallet
    const wallet = await EmbeddedWallet.unlock(password);
    const address = wallet.address;

    // 2. Request CB nonce
    const nonceRes = await fetch(`${API_BASE_URL}/cb/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (!nonceRes.ok) {
      const err = await nonceRes.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to request CB nonce');
    }

    const { nonce, message } = await nonceRes.json();

    // 3. Sign the CB-specific message
    const signature = await wallet.signMessage(message);

    // 4. Get CB ticket
    const ticketRes = await fetch(`${API_BASE_URL}/cb/auth/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, nonce }),
    });

    if (!ticketRes.ok) {
      const err = await ticketRes.json().catch(() => ({}));
      throw new Error(err.message || 'CB authentication failed');
    }

    const data = await ticketRes.json();

    // 5. Store CB ticket
    window.localStorage.setItem(STORAGE_CB_TICKET, data.cbTicket);
    return data.cbTicket;
  },

  // ============================
  // HELPERS
  // ============================

  getHeaders: (): Record<string, string> => {
    const ticket = cbApi.getTicket();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ticket) {
      headers['x-cb-ticket'] = ticket;
    }
    return headers;
  },

  // ============================
  // PUBLIC (no auth)
  // ============================

  getPublicStats: async (): Promise<CBPublicStats> => {
    const res = await fetch(`${API_BASE_URL}/cb/stats`);
    if (!res.ok) throw new Error('Failed to fetch CB stats');
    const data = await res.json();
    return data;
  },

  // ============================
  // EMISSION
  // ============================

  getSupply: async (): Promise<{ minted: string; burned: string; circulating: string }> => {
    const res = await fetch(`${API_BASE_URL}/cb/emission/supply`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch supply');
    }
    return res.json();
  },

  getDailyEmission: async (): Promise<{ used: string; limit: string; remaining: string }> => {
    const res = await fetch(`${API_BASE_URL}/cb/emission/daily`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch daily emission');
    }
    return res.json();
  },

  getEmissionHistory: async (limit = 50): Promise<EmissionRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/cb/emission/history?limit=${limit}`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch emission history');
    }
    const data = await res.json();
    return data.records;
  },

  emit: async (corrAccountId: string, amount: number, reason: string, memo?: string) => {
    const res = await fetch(`${API_BASE_URL}/cb/emission/mint`, {
      method: 'POST',
      headers: cbApi.getHeaders(),
      body: JSON.stringify({ corrAccountId, amount, reason, memo }),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Emission failed');
    }
    return res.json();
  },

  burn: async (corrAccountId: string, amount: number, reason: string) => {
    const res = await fetch(`${API_BASE_URL}/cb/emission/burn`, {
      method: 'POST',
      headers: cbApi.getHeaders(),
      body: JSON.stringify({ corrAccountId, amount, reason }),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Burn failed');
    }
    return res.json();
  },

  // ============================
  // LICENSING
  // ============================

  getLicensedBanks: async (): Promise<LicensedBank[]> => {
    const res = await fetch(`${API_BASE_URL}/cb/license/list`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch licensed banks');
    }
    const data = await res.json();
    return data.banks;
  },

  issueLicense: async (bankAddress: string, bankCode: string, bankName: string) => {
    const res = await fetch(`${API_BASE_URL}/cb/license/issue`, {
      method: 'POST',
      headers: cbApi.getHeaders(),
      body: JSON.stringify({ bankAddress, bankCode, bankName }),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'License issuance failed');
    }
    return res.json();
  },

  revokeLicense: async (licenseId: string, reason: string) => {
    const res = await fetch(`${API_BASE_URL}/cb/license/revoke`, {
      method: 'POST',
      headers: cbApi.getHeaders(),
      body: JSON.stringify({ licenseId, reason }),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'License revocation failed');
    }
    return res.json();
  },

  // ============================
  // CORRESPONDENT ACCOUNTS
  // ============================

  getCorrAccounts: async (): Promise<CorrAccount[]> => {
    const res = await fetch(`${API_BASE_URL}/cb/corr-accounts`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch corr accounts');
    }
    const data = await res.json();
    return data.accounts;
  },

  // ============================
  // MONETARY POLICY
  // ============================

  getCurrentPolicy: async (): Promise<MonetaryPolicy> => {
    const res = await fetch(`${API_BASE_URL}/cb/policy/current`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch policy');
    }
    const data = await res.json();
    return data.policy;
  },

  updatePolicy: async (
    changes: { officialRate?: number; reserveRequirement?: number; dailyEmissionLimit?: number },
    reason: string,
  ) => {
    const res = await fetch(`${API_BASE_URL}/cb/policy/update`, {
      method: 'POST',
      headers: cbApi.getHeaders(),
      body: JSON.stringify({ ...changes, reason }),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Policy update failed');
    }
    return res.json();
  },

  getPolicyHistory: async (limit = 50): Promise<PolicyChange[]> => {
    const res = await fetch(`${API_BASE_URL}/cb/policy/history?limit=${limit}`, {
      headers: cbApi.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) { cbApi.clearTicket(); throw new Error('CB ticket expired'); }
      throw new Error('Failed to fetch policy history');
    }
    const data = await res.json();
    return data.changes;
  },
};
