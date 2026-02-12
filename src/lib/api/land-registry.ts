import { api } from './client';

// ============ Types ============

export type LandType = 'AGRICULTURAL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'FOREST' | 'OTHER';
export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'AGRICULTURAL' | 'MIXED' | 'OTHER';
export type OwnershipType = 'FULL' | 'SHARED';
export type LeaseType = 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL';
export type TransactionStatus = 'INITIATED' | 'PAYMENT_PENDING' | 'PAYMENT_CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface LandPlot {
  id: string;
  cadastralNumber: string;
  
  // Location
  region: string;
  district: string;
  locality?: string;
  address?: string;
  
  // Geographic data
  latitude: number;
  longitude: number;
  boundaries?: any; // GeoJSON polygon
  area: number; // square meters
  
  // Land details
  landType: LandType;
  soilQuality?: string;
  irrigated: boolean;
  
  // Registration
  registeredBy: string;
  registeredAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  landPlotId: string;
  
  // Property details
  propertyType: PropertyType;
  buildingArea?: number;
  floors?: number;
  rooms?: number;
  yearBuilt?: number;
  
  // Utilities
  hasElectricity: boolean;
  hasWater: boolean;
  hasGas: boolean;
  hasSewage: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Ownership {
  id: string;
  landPlotId?: string;
  propertyId?: string;
  
  // Owner
  ownerId: string;
  ownerName: string;
  ownershipType: OwnershipType;
  sharePercentage: number; // 0-100
  
  // Citizenship verification
  isCitizenVerified: boolean;
  
  // Certificate
  certificateNumber: string;
  issuedAt: Date;
  isActive: boolean;
  
  // Co-owners (if shared)
  coOwners?: string[]; // userIds
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Lease {
  id: string;
  propertyId: string;
  
  // Lessee (can be foreigner)
  lesseeId: string;
  lesseeName: string;
  lesseeNationality: string;
  
  // Lease terms
  leaseType: LeaseType;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  currency: string;
  
  // Status
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'SALE' | 'TRANSFER' | 'INHERITANCE' | 'GIFT' | 'MORTGAGE' | 'LEASE' | 'COURT_ORDER' | 'EXPROPRIATION' | 'OTHER';
  
  // Property
  landPlotId?: string;
  propertyId?: string;
  
  // Parties
  sellerId: string;
  buyerId: string;
  sellerName: string;
  buyerName: string;
  
  // Transaction details
  salePrice: number;
  currency: string;
  status: TransactionStatus;
  
  // Payment
  paymentTxHash?: string; // blockchain transaction
  paidAt?: Date;
  
  // Completion
  completedBy?: string; // Officer userId
  completedAt?: Date;
  blockchainTxHash?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyValuation {
  landPlotId?: string;
  propertyId?: string;
  estimatedValue: number;
  currency: string;
  valuationDate: Date;
  factors: {
    baseValue: number;
    locationMultiplier: number;
    ageAdjustment: number;
    conditionMultiplier: number;
  };
}

export interface CadastralSearchParams {
  region?: string;
  district?: string;
  locality?: string;
  landType?: LandType;
}

export interface GPSBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

export interface RegisterLandPlotData {
  region: string;
  district: string;
  locality?: string;
  address?: string;
  latitude: number;
  longitude: number;
  boundaries?: any;
  area: number;
  landType: LandType;
  soilQuality?: string;
  irrigated: boolean;
}

export interface RegisterOwnershipData {
  landPlotId?: string;
  propertyId?: string;
  ownershipType: OwnershipType;
  sharePercentage: number;
  coOwners?: string[];
}

export interface RegisterLeaseData {
  propertyId: string;
  lesseeId: string;
  lesseeName: string;
  lesseeNationality: string;
  leaseType: LeaseType;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  currency: string;
}

export interface InitiateTransferData {
  landPlotId?: string;
  propertyId?: string;
  buyerId: string;
  salePrice: number;
  currency: string;
}

// ============ API Functions ============

/**
 * Register new land plot (Officer only initially)
 */
export const registerLandPlot = async (
  data: RegisterLandPlotData
): Promise<LandPlot> => {
  const response = await api.post<LandPlot>(
    '/land-registry/cadastral/land-plots',
    data
  );
  return response;
};

/**
 * Get land plot by cadastral number
 */
export const getLandPlotByCadastral = async (
  cadastralNumber: string
): Promise<LandPlot> => {
  const response = await api.get<LandPlot>(
    `/land-registry/cadastral/land-plots/${cadastralNumber}`
  );
  return response;
};

/**
 * Search land plots by location
 */
export const searchLandPlots = async (
  params: CadastralSearchParams
): Promise<LandPlot[]> => {
  const queryParams = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined) as any
  ).toString();
  
  const response = await api.get<LandPlot[]>(
    `/land-registry/cadastral/land-plots?${queryParams}`
  );
  return response;
};

/**
 * Search land plots by GPS bounds
 */
export const searchLandPlotsByGPS = async (
  bounds: GPSBounds
): Promise<LandPlot[]> => {
  const response = await api.post<LandPlot[]>(
    '/land-registry/cadastral/land-plots/search/gps',
    bounds
  );
  return response;
};

/**
 * Get current user's ownerships
 */
export const getMyOwnerships = async (): Promise<Ownership[]> => {
  const response = await api.get<Ownership[]>(
    '/land-registry/cadastral/ownerships/me'
  );
  return response;
};

/**
 * Get current user's leases
 */
export const getMyLeases = async (): Promise<Lease[]> => {
  const response = await api.get<Lease[]>(
    '/land-registry/cadastral/leases/me'
  );
  return response;
};

/**
 * Get transaction history
 */
export const getTransactionHistory = async (
  landPlotId?: string,
  propertyId?: string
): Promise<Transaction[]> => {
  const params = new URLSearchParams();
  if (landPlotId) params.append('landPlotId', landPlotId);
  if (propertyId) params.append('propertyId', propertyId);
  
  const response = await api.get<Transaction[]>(
    `/land-registry/cadastral/transactions?${params.toString()}`
  );
  return response;
};

/**
 * Register ownership (citizens only)
 */
export const registerOwnership = async (
  data: RegisterOwnershipData
): Promise<Ownership> => {
  const response = await api.post<Ownership>(
    '/land-registry/property/ownership',
    data
  );
  return response;
};

/**
 * Register lease (foreigners allowed)
 */
export const registerLease = async (
  data: RegisterLeaseData
): Promise<Lease> => {
  const response = await api.post<Lease>(
    '/land-registry/property/lease',
    data
  );
  return response;
};

/**
 * Initiate property transfer
 */
export const initiatePropertyTransfer = async (
  data: InitiateTransferData
): Promise<Transaction> => {
  const response = await api.post<Transaction>(
    '/land-registry/property/transfer',
    data
  );
  return response;
};

/**
 * Confirm payment for transfer (buyer)
 */
export const confirmTransferPayment = async (
  transactionId: string,
  paymentTxHash: string
): Promise<Transaction> => {
  const response = await api.post<Transaction>(
    `/land-registry/property/transfer/${transactionId}/pay`,
    { paymentTxHash }
  );
  return response;
};

/**
 * Complete transfer (Officer only)
 */
export const completePropertyTransfer = async (
  transactionId: string,
  blockchainTxHash?: string
): Promise<Transaction> => {
  const response = await api.post<Transaction>(
    `/land-registry/property/transfer/${transactionId}/complete`,
    { blockchainTxHash }
  );
  return response;
};

/**
 * Calculate property valuation
 */
export const calculatePropertyValuation = async (
  landPlotId?: string,
  propertyId?: string
): Promise<PropertyValuation> => {
  const response = await api.post<PropertyValuation>(
    '/land-registry/property/valuation',
    { landPlotId, propertyId }
  );
  return response;
};

/**
 * Get market trends for region
 */
export const getMarketTrends = async (
  region: string
): Promise<any> => {
  const response = await api.get(`/land-registry/property/market/${region}`);
  return response;
};

export default {
  registerLandPlot,
  getLandPlotByCadastral,
  searchLandPlots,
  searchLandPlotsByGPS,
  getMyOwnerships,
  getMyLeases,
  getTransactionHistory,
  registerOwnership,
  registerLease,
  initiatePropertyTransfer,
  confirmTransferPayment,
  completePropertyTransfer,
  calculatePropertyValuation,
  getMarketTrends,
};
