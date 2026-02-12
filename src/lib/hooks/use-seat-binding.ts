"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export type SeatBindingStatus = {
  isBound: boolean;
  walletAddress: string | null;
  seatId: string | null;
  seatInfo: any | null; // Placeholder for full seat info
};

export function useSeatBinding() {
  const [status, setStatus] = useState<SeatBindingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const seatId = typeof window !== 'undefined' ? localStorage.getItem('seatId') : null;
    if (!seatId) {
      return; 
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<SeatBindingStatus>("/seat-binding/status");
      setStatus(data);
    } catch (err: any) {
      console.error("Failed to fetch seat binding status:", err);
      setError(err.message || "Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bindSeat = async (seatId: string, walletAddress: string) => {
    setIsLoading(true);
    try {
      await api.post("/seat-binding/bind", { seatId, walletAddress });
      await fetchStatus(); // Refresh
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refresh: fetchStatus,
    bindSeat
  };
}
