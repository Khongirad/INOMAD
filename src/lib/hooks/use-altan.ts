"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export type AltanTransaction = {
  id: string;
  fromUser?: { seatId: string; role: string };
  toUser?: { seatId: string; role: string };
  amount: number;
  type: string;
  createdAt: string;
};

export function useAltan() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<AltanTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const bal = await api.get<number>("/altan/balance");
      setBalance(bal);
      const hist = await api.get<AltanTransaction[]>("/altan/history");
      setHistory(hist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const transfer = async (recipientId: string, amount: number) => {
    await api.post("/altan/transfer", { recipientId, amount });
    await refresh();
  };

  const resolveUser = async (identifier: string) => {
    return api.get<{ userId: string; seatId: string; role: string; organization?: string }>(
      `/altan/resolve/${identifier}`
    );
  };

  return {
    balance,
    history,
    loading,
    refresh,
    transfer,
    resolveUser,
  };
}
