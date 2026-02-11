// ============ Land Registry Types ============

export type LandType = 'AGRICULTURAL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED' | 'PROTECTED';

export type LandPropertyType = 'HOUSE' | 'APARTMENT' | 'BUILDING' | 'WAREHOUSE' | 'OTHER';

export type LandOwnershipType = 'PRIVATE' | 'STATE' | 'COMMUNAL' | 'LEASED';

export type LeaseType = 'SHORT_TERM' | 'LONG_TERM' | 'PERPETUAL';

export type LandTransactionType = 'SALE' | 'GIFT' | 'INHERITANCE' | 'EXCHANGE';

export type LandTransactionStatus =
  | 'INITIATED'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LandPlot {
  id: string;
  cadastralNumber: string;
  area: number;
  landType: LandType;
  address: string;
  region: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  boundaries?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandOwnership {
  id: string;
  plotId: string;
  ownerId: string;
  ownershipType: LandOwnershipType;
  sharePercent: number;
  registeredAt: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandLease {
  id: string;
  plotId: string;
  lesseeId: string;
  leaseType: LeaseType;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandTransaction {
  id: string;
  plotId: string;
  sellerId: string;
  buyerId: string;
  transactionType: LandTransactionType;
  status: LandTransactionStatus;
  price: number;
  initiatedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GpsSearchBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

export interface PropertyValuation {
  plotId: string;
  estimatedValue: number;
  pricePerSqm: number;
  valuationDate: Date;
  factors: Record<string, number>;
}

export interface MarketTrends {
  region: string;
  totalPlots: number;
  averagePrice: number;
  priceChange: number;
  transactionVolume: number;
}
