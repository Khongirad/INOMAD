import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface TaxQuote {
  totalTax: string;
  republicTax: string;
  confederationTax: string;
  taxRate: number;
}

export interface TaxStats {
  taxRate: number;
  republicShare: number;
  confederationShare: number;
}

/**
 * Tax System API Client
 */
export const taxApi = {
  /**
   * Quote tax for an amount
   */
  quoteTax: async (amount: string): Promise<TaxQuote> => {
    const response = await axios.get(`${API_BASE}/tax/quote`, {
      params: { amount },
    });
    return response.data.data;
  },

  /**
   * Collect tax from payer
   */
  collectTax: async (data: {
    payerAccountId: string;
    republicKey: string;
    asset: string;
    amount: string;
    privateKey: string;
  }): Promise<{ txHash: string }> => {
    const response = await axios.post(`${API_BASE}/tax/collect`, data);
    return response.data.data;
  },

  /**
   * Get tax statistics
   */
  getTaxStats: async (): Promise<TaxStats> => {
    const response = await axios.get(`${API_BASE}/tax/stats`);
    return response.data.data;
  },

  /**
   * Get confederation account ID
   */
  getConfederationAccount: async (): Promise<{ accountId: string }> => {
    const response = await axios.get(`${API_BASE}/tax/confederation-account`);
    return response.data.data;
  },

  /**
   * Get republic account ID
   */
  getRepublicAccount: async (republicKey: string): Promise<{ accountId: string }> => {
    const response = await axios.get(`${API_BASE}/tax/republic/${republicKey}/account`);
    return response.data.data;
  },

  /**
   * Set republic account (admin)
   */
  setRepublic: async (data: {
    republicKey: string;
    republicAccountId: string;
    privateKey: string;
  }): Promise<{ txHash: string }> => {
    const response = await axios.put(`${API_BASE}/tax/republic`, data);
    return response.data.data;
  },

  /**
   * Set collector permissions (admin)
   */
  setCollector: async (data: {
    collectorAddress: string;
    allowed: boolean;
    privateKey: string;
  }): Promise<{ txHash: string }> => {
    const response = await axios.put(`${API_BASE}/tax/collector`, data);
    return response.data.data;
  },

  /**
   * Check if address is collector
   */
  checkCollector: async (address: string): Promise<{ isCollector: boolean }> => {
    const response = await axios.get(`${API_BASE}/tax/collector/${address}/check`);
    return response.data.data;
  },
};

/**
 * Helper: Calculate tax breakdown
 */
export const calculateTaxBreakdown = (amount: number, taxRate: number = 10) => {
  const totalTax = (amount * taxRate) / 100;
  const republicTax = (amount * 7) / 100;
  const confederationTax = (amount * 3) / 100;

  return {
    amount,
    totalTax,
    republicTax,
    confederationTax,
    netAmount: amount - totalTax,
  };
};
