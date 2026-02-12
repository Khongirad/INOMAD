import { api } from './client';

// ==========================================
// TYPES
// ==========================================

export type OrgBankTxType = 'OUTGOING' | 'INCOMING' | 'INTERNAL' | 'TAX_PAYMENT';
export type OrgBankTxStatus = 'PENDING' | 'CLIENT_APPROVED' | 'BANK_APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type BankApprovalLevel = 'MANAGER' | 'SENIOR_MANAGER' | 'CHAIRMAN';

export interface OrgBankAccount {
  id: string;
  organizationId: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: number;
  clientSignaturesRequired: number;
  bankApprovalLevel: BankApprovalLevel;
  organization?: { id: string; name: string; type: string };
  _count?: { transactions: number };
  createdAt: string;
}

export interface OrgBankTransaction {
  id: string;
  accountId: string;
  type: OrgBankTxType;
  amount: number;
  currency: string;
  description: string;
  recipientAccount?: string;
  initiatorId: string;
  clientSignatures: Array<{ userId: string; signedAt: string }>;
  clientApproved: boolean;
  bankApproverId?: string;
  bankApprovalLevel?: BankApprovalLevel;
  bankApproved: boolean;
  bankApprovalNote?: string;
  status: OrgBankTxStatus;
  txHash?: string;
  reportDate: string;
  createdAt: string;
  completedAt?: string;
  account?: OrgBankAccount;
  initiator?: { id: string; username: string };
}

export interface BankDailyReport {
  id: string;
  accountId: string;
  reportDate: string;
  openingBalance: number;
  closingBalance: number;
  totalIncoming: number;
  totalOutgoing: number;
  txCount: number;
  pendingCount: number;
  generatedAt: string;
  account?: OrgBankAccount;
}

export interface InitiateTransactionDto {
  accountId: string;
  type: OrgBankTxType;
  amount: number;
  description: string;
  recipientAccount?: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

/** Get all bank accounts for an org */
export const getOrgBankAccounts = async (orgId: string): Promise<OrgBankAccount[]> => {
  return api.get<OrgBankAccount[]>(`/org-banking/accounts/${orgId}`);
};

/** Initiate a new transaction */
export const initiateTransaction = async (data: InitiateTransactionDto): Promise<OrgBankTransaction> => {
  return api.post<OrgBankTransaction>('/org-banking/transactions/initiate', data);
};

/** Sign a pending transaction (co-signer) */
export const signTransaction = async (txId: string): Promise<OrgBankTransaction> => {
  return api.post<OrgBankTransaction>(`/org-banking/transactions/${txId}/sign`, {});
};

/** Bank officer approves a transaction */
export const bankApproveTransaction = async (
  txId: string,
  data: { approved: boolean; note?: string }
): Promise<OrgBankTransaction> => {
  return api.post<OrgBankTransaction>(`/org-banking/transactions/${txId}/bank-approve`, data);
};

/** Cancel a pending transaction */
export const cancelTransaction = async (txId: string): Promise<OrgBankTransaction> => {
  return api.post<OrgBankTransaction>(`/org-banking/transactions/${txId}/cancel`, {});
};

/** Get transactions for an account */
export const getAccountTransactions = async (accountId: string): Promise<OrgBankTransaction[]> => {
  return api.get<OrgBankTransaction[]>(`/org-banking/transactions/${accountId}`);
};

/** Get pending transactions for bank officer view */
export const getPendingTransactions = async (orgId: string): Promise<OrgBankTransaction[]> => {
  return api.get<OrgBankTransaction[]>(`/org-banking/transactions/${orgId}/pending`);
};

/** Get daily reports for an account */
export const getDailyReports = async (accountId: string): Promise<BankDailyReport[]> => {
  return api.get<BankDailyReport[]>(`/org-banking/reports/${accountId}`);
};
