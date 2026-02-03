/**
 * useMarketplace Hook
 * 
 * Custom React hook for marketplace state management including:
 * - Listing management (CRUD operations)
 * - Purchase flow
 * - Rating system
 * - User's marketplace data
 * - Error handling
 */

import { useState, useCallback } from 'react';
import {
  marketplaceApi,
  MarketplaceListing,
  MarketplacePurchase,
  MarketplaceStats,
  CreateListingDto,
  UpdateListingDto,
  PurchaseItemDto,
  MarkPaidDto,
  ShipItemDto,
  RateSellerDto,
  ListingFilters,
} from '../lib/api/marketplace.api';

interface UseMarketplaceState {
  // Data
  listings: MarketplaceListing[];
  currentListing: MarketplaceListing | null;
  myListings: MarketplaceListing[];
  myPurchases: MarketplacePurchase[];
  mySales: MarketplacePurchase[];
  stats: MarketplaceStats | null;
  
  // UI State
  loading: boolean;
  error: string | null;
}

interface UseMarketplaceReturn extends UseMarketplaceState {
  // Listing Management
  createListing: (data: CreateListingDto) => Promise<MarketplaceListing | null>;
  getAllListings: (filters?: ListingFilters) => Promise<void>;
  getListing: (id: string) => Promise<void>;
  getListingsBySeller: (sellerId: string) => Promise<void>;
  updateListing: (id: string, data: UpdateListingDto) => Promise<boolean>;
  deleteListing: (id: string) => Promise<boolean>;
  
  // Purchase Flow
  purchaseItem: (data: PurchaseItemDto) => Promise<MarketplacePurchase | null>;
  markPaid: (purchaseId: string, data: MarkPaidDto) => Promise<boolean>;
  shipItem: (purchaseId: string, data: ShipItemDto) => Promise<boolean>;
  confirmDelivery: (purchaseId: string) => Promise<boolean>;
  completePurchase: (purchaseId: string) => Promise<boolean>;
  rateSeller: (purchaseId: string, data: RateSellerDto) => Promise<boolean>;
  
  // User Data
  fetchMyListings: () => Promise<void>;
  fetchMyPurchases: () => Promise<void>;
  fetchMySales: () => Promise<void>;
  
  // Statistics
  fetchStats: () => Promise<void>;
  
  // Search
  searchListings: (query: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export function useMarketplace(): UseMarketplaceReturn {
  const [state, setState] = useState<UseMarketplaceState>({
    listings: [],
    currentListing: null,
    myListings: [],
    myPurchases: [],
    mySales: [],
    stats: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listing Management

  const createListing = useCallback(async (data: CreateListingDto): Promise<MarketplaceListing | null> => {
    try {
      setLoading(true);
      setError(null);
      const listing = await marketplaceApi.createListing(data);
      setState((prev) => ({
        ...prev,
        myListings: [...prev.myListings, listing],
        loading: false,
      }));
      return listing;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create listing');
      setLoading(false);
      return null;
    }
  }, []);

  const getAllListings = useCallback(async (filters?: ListingFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const listings = await marketplaceApi.getAllListings(filters);
      setState((prev) => ({ ...prev, listings, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch listings');
      setLoading(false);
    }
  }, []);

  const getListing = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const listing = await marketplaceApi.getListing(id);
      setState((prev) => ({ ...prev, currentListing: listing, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch listing');
      setLoading(false);
    }
  }, []);

  const getListingsBySeller = useCallback(async (sellerId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const listings = await marketplaceApi.getListingsBySeller(sellerId);
      setState((prev) => ({ ...prev, listings, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch seller listings');
      setLoading(false);
    }
  }, []);

  const updateListing = useCallback(async (id: string, data: UpdateListingDto): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const updated = await marketplaceApi.updateListing(id, data);
      setState((prev) => ({
        ...prev,
        myListings: prev.myListings.map((l) => (l.id === id ? updated : l)),
        currentListing: prev.currentListing?.id === id ? updated : prev.currentListing,
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update listing');
      setLoading(false);
      return false;
    }
  }, []);

  const deleteListing = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.deleteListing(id);
      setState((prev) => ({
        ...prev,
        myListings: prev.myListings.filter((l) => l.id !== id),
        listings: prev.listings.filter((l) => l.id !== id),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete listing');
      setLoading(false);
      return false;
    }
  }, []);

  // Purchase Flow

  const purchaseItem = useCallback(async (data: PurchaseItemDto): Promise<MarketplacePurchase | null> => {
    try {
      setLoading(true);
      setError(null);
      const purchase = await marketplaceApi.purchaseItem(data);
      setState((prev) => ({
        ...prev,
        myPurchases: [...prev.myPurchases, purchase],
        loading: false,
      }));
      return purchase;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to purchase item');
      setLoading(false);
      return null;
    }
  }, []);

  const markPaid = useCallback(async (purchaseId: string, data: MarkPaidDto): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.markPaid(purchaseId, data);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark as paid');
      setLoading(false);
      return false;
    }
  }, []);

  const shipItem = useCallback(async (purchaseId: string, data: ShipItemDto): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.shipItem(purchaseId, data);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to ship item');
      setLoading(false);
      return false;
    }
  }, []);

  const confirmDelivery = useCallback(async (purchaseId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.confirmDelivery(purchaseId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm delivery');
      setLoading(false);
      return false;
    }
  }, []);

  const completePurchase = useCallback(async (purchaseId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.completePurchase(purchaseId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete purchase');
      setLoading(false);
      return false;
    }
  }, []);

  const rateSeller = useCallback(async (purchaseId: string, data: RateSellerDto): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceApi.rateSeller(purchaseId, data);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rate seller');
      setLoading(false);
      return false;
    }
  }, []);

  // User Data

  const fetchMyListings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceApi.getMyListings();
      setState((prev) => ({ ...prev, myListings: data.listings, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch my listings');
      setLoading(false);
    }
  }, []);

  const fetchMyPurchases = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceApi.getMyPurchases();
      setState((prev) => ({ ...prev, myPurchases: data.purchases, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch my purchases');
      setLoading(false);
    }
  }, []);

  const fetchMySales = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceApi.getMySales();
      setState((prev) => ({ ...prev, mySales: data.sales, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch my sales');
      setLoading(false);
    }
  }, []);

  // Statistics

  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const stats = await marketplaceApi.getMarketplaceStats();
      setState((prev) => ({ ...prev, stats, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      setLoading(false);
    }
  }, []);

  // Search

  const searchListings = useCallback(async (query: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const listings = await marketplaceApi.searchListings(query);
      setState((prev) => ({ ...prev, listings, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search listings');
      setLoading(false);
    }
  }, []);

  return {
    ...state,
    createListing,
    getAllListings,
    getListing,
    getListingsBySeller,
    updateListing,
    deleteListing,
    purchaseItem,
    markPaid,
    shipItem,
    confirmDelivery,
    completePurchase,
    rateSeller,
    fetchMyListings,
    fetchMyPurchases,
    fetchMySales,
    fetchStats,
    searchListings,
    clearError,
  };
}
