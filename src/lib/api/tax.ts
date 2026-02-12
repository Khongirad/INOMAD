import { api } from './client';

// ==========================================
// TYPES
// ==========================================

export type TaxRecordStatus = 'DRAFT' | 'FILED' | 'PAID' | 'OVERDUE' | 'DISPUTED';

export interface TaxRecord {
  id: string;
  userId: string;
  republicId: string;
  taxYear: number;
  taxPeriodStart: string;
  taxPeriodEnd: string;
  totalIncome: number;
  totalQuestsCompleted: number;
  taxRate: number;
  republicTaxRate: number;
  confederationTaxRate: number;
  totalTaxDue: number;
  republicTaxDue: number;
  confederationTaxDue: number;
  totalTaxPaid: number;
  isPaid: boolean;
  paidAt?: string;
  paymentTxHash?: string;
  status: TaxRecordStatus;
  createdAt: string;
  updatedAt: string;
  republic?: { id: string; name: string };
}

// ==========================================
// API FUNCTIONS
// ==========================================

/** Generate a tax record for a given year */
export const generateTaxRecord = async (year: number): Promise<TaxRecord> => {
  return api.post<TaxRecord>('/tax/generate', { year });
};

/** File a tax return (DRAFT → FILED) */
export const fileTaxReturn = async (taxRecordId: string): Promise<TaxRecord> => {
  return api.post<TaxRecord>(`/tax/${taxRecordId}/file`, {});
};

/** Pay a tax record (FILED → PAID) */
export const payTax = async (taxRecordId: string): Promise<TaxRecord> => {
  return api.post<TaxRecord>(`/tax/${taxRecordId}/pay`, {});
};

/** Get tax history for current user */
export const getTaxHistory = async (): Promise<TaxRecord[]> => {
  return api.get<TaxRecord[]>('/tax/history');
};

/** Get a single tax record by ID */
export const getTaxRecord = async (id: string): Promise<TaxRecord> => {
  return api.get<TaxRecord>(`/tax/${id}`);
};
