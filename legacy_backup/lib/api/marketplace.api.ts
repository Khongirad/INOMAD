/**
 * Marketplace API Client
 * 
 * Complete API client for marketplace operations including:
 * - Listing management (create, read, update, delete)
 * - Purchase flow (buy, pay, ship, deliver, complete)
 * - Rating system
 * - Seller dashboard
 * - Statistics
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

export type MarketplaceListingType = 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE' | 'WORK';
export type MarketplaceListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SOLD_OUT' | 'ARCHIVED';
export type MarketplacePurchaseStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED';

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  categoryId: number;
  listingType: MarketplaceListingType;
  status: MarketplaceListingStatus;
  title: string;
  description: string;
  images: string[];
  price: string;
  stock: number;
  sold: number;
  totalRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplacePurchase {
  id: string;
  listingId: string;
  buyerId: string;
  quantity: number;
  totalPrice: string;
  status: MarketplacePurchaseStatus;
  shippingAddress?: string;
  trackingInfo?: string;
  txHash?: string;
  escrowId?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  listing?: MarketplaceListing;
}

export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalPurchases: number;
  completedPurchases: number;
  totalVolume: string;
}

// Request DTOs
export interface CreateListingDto {
  categoryId: number;
  listingType: MarketplaceListingType;
  title: string;
  description: string;
  price: string;
  stock?: number;
  images?: string[];
}

export interface UpdateListingDto {
  title?: string;
  description?: string;
  price?: string;
  stock?: number;
  status?: MarketplaceListingStatus;
  images?: string[];
}

export interface PurchaseItemDto {
  listingId: string;
  quantity: number;
  shippingAddress?: string;
}

export interface MarkPaidDto {
  txHash: string;
  escrowId?: string;
}

export interface ShipItemDto {
  trackingInfo: string;
}

export interface RateSellerDto {
  rating: number;
  review?: string;
}

export interface ListingFilters {
  categoryId?: number;
  listingType?: MarketplaceListingType;
  status?: MarketplaceListingStatus;
  sellerId?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
}

// ============================================================================
// API Client
// ============================================================================

class MarketplaceApi {
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Listing Management

  async createListing(data: CreateListingDto): Promise<MarketplaceListing> {
    const response = await axios.post(
      `${API_BASE_URL}/marketplace/listings`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getAllListings(filters?: ListingFilters): Promise<MarketplaceListing[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/marketplace/listings?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getListing(id: string): Promise<MarketplaceListing> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/listings/${id}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getListingsBySeller(sellerId: string): Promise<MarketplaceListing[]> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/sellers/${sellerId}/listings`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async updateListing(id: string, data: UpdateListingDto): Promise<MarketplaceListing> {
    const response = await axios.put(
      `${API_BASE_URL}/marketplace/listings/${id}`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async deleteListing(id: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/marketplace/listings/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Purchase Flow

  async purchaseItem(data: PurchaseItemDto): Promise<MarketplacePurchase> {
    const response = await axios.post(
      `${API_BASE_URL}/marketplace/listings/${data.listingId}/purchase`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async markPaid(purchaseId: string, data: MarkPaidDto): Promise<MarketplacePurchase> {
    const response = await axios.put(
      `${API_BASE_URL}/marketplace/purchases/${purchaseId}/mark-paid`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async shipItem(purchaseId: string, data: ShipItemDto): Promise<MarketplacePurchase> {
    const response = await axios.put(
      `${API_BASE_URL}/marketplace/purchases/${purchaseId}/ship`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async confirmDelivery(purchaseId: string): Promise<MarketplacePurchase> {
    const response = await axios.put(
      `${API_BASE_URL}/marketplace/purchases/${purchaseId}/deliver`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async completePurchase(purchaseId: string): Promise<MarketplacePurchase> {
    const response = await axios.put(
      `${API_BASE_URL}/marketplace/purchases/${purchaseId}/complete`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async rateSeller(purchaseId: string, data: RateSellerDto): Promise<MarketplacePurchase> {
    const response = await axios.post(
      `${API_BASE_URL}/marketplace/purchases/${purchaseId}/rate`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // User's Marketplace Data

  async getMyListings(): Promise<{
    total: number;
    active: number;
    soldOut: number;
    archived: number;
    listings: MarketplaceListing[];
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/my/listings`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getMyPurchases(): Promise<{
    total: number;
    pending: number;
    completed: number;
    purchases: MarketplacePurchase[];
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/my/purchases`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getMySales(): Promise<{
    total: number;
    revenue: string;
    pending: number;
    completed: number;
    sales: MarketplacePurchase[];
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/my/sales`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Statistics

  async getMarketplaceStats(): Promise<MarketplaceStats> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/stats`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Search

  async searchListings(query: string): Promise<MarketplaceListing[]> {
    const response = await axios.get(
      `${API_BASE_URL}/marketplace/listings?search=${encodeURIComponent(query)}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const marketplaceApi = new MarketplaceApi();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate average rating for a listing
 */
export function calculateAverageRating(totalRating: number, reviewCount: number): number {
  if (reviewCount === 0) return 0;
  return totalRating / reviewCount;
}

/**
 * Format price for display
 */
export function formatPrice(price: string): string {
  const num = parseFloat(price);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Check if user can edit listing (is owner)
 */
export function canEditListing(listing: MarketplaceListing, userId: string): boolean {
  return listing.sellerId === userId;
}

/**
 * Check if listing is available for purchase
 */
export function isListingAvailable(listing: MarketplaceListing): boolean {
  return (
    listing.status === 'ACTIVE' &&
    (listing.stock === 0 || listing.stock > listing.sold)
  );
}

/**
 * Get status badge color
 */
export function getStatusColor(status: MarketplaceListingStatus | MarketplacePurchaseStatus): string {
  const colors: Record<string, string> = {
    ACTIVE: 'success',
    DRAFT: 'default',
    PAUSED: 'warning',
    SOLD_OUT: 'error',
    ARCHIVED: 'default',
    PENDING: 'warning',
    PAID: 'info',
    SHIPPED: 'info',
    DELIVERED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    DISPUTED: 'error',
    REFUNDED: 'warning',
  };
  return colors[status] || 'default';
}
